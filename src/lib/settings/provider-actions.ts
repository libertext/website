"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveWorkspace } from "@/lib/auth/current";
import { requireWorkspace } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret, decryptSecret, maskKey } from "@/lib/crypto/encryption";
import { getProvider } from "@/lib/ai/registry";
import { audit } from "@/lib/services/audit";

const providerEnum = z.enum(["openai", "anthropic", "gemini"]);

/** Store a BYOK key — encrypted, server-only, never returned to the browser (§17, §198). */
export async function saveProviderKeyAction(formData: FormData) {
  const { user, workspace } = await getActiveWorkspace();
  await requireWorkspace(workspace.id, "ADMIN");
  const provider = providerEnum.parse(formData.get("provider"));
  const key = String(formData.get("apiKey") || "").trim();
  if (key.length < 8) throw new Error("Geçersiz API anahtarı.");

  await prisma.userProviderCredential.upsert({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider } },
    update: { encryptedKey: encryptSecret(key), keyLast4: maskKey(key), active: true },
    create: {
      workspaceId: workspace.id,
      provider,
      encryptedKey: encryptSecret(key),
      keyLast4: maskKey(key),
    },
  });
  await audit({ workspaceId: workspace.id, actorUserId: user.id, action: "API_KEY_ADDED", targetType: "provider", targetId: provider });
  revalidatePath("/settings");
}

/** Remove a BYOK key; usage history is preserved, only the credential dies (§212). */
export async function removeProviderKeyAction(formData: FormData) {
  const { user, workspace } = await getActiveWorkspace();
  await requireWorkspace(workspace.id, "ADMIN");
  const provider = providerEnum.parse(formData.get("provider"));
  await prisma.userProviderCredential.deleteMany({ where: { workspaceId: workspace.id, provider } });
  await audit({ workspaceId: workspace.id, actorUserId: user.id, action: "API_KEY_REMOVED", targetType: "provider", targetId: provider });
  revalidatePath("/settings");
}

/** Validate a stored key with a minimal health-check request (§213). */
export async function testProviderKeyAction(provider: string): Promise<{ ok: boolean }> {
  const { workspace } = await getActiveWorkspace();
  await requireWorkspace(workspace.id, "ADMIN");
  const p = providerEnum.parse(provider);
  const cred = await prisma.userProviderCredential.findUnique({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider: p } },
  });
  if (!cred) return { ok: false };
  // Touch decrypt to ensure the blob is valid, then health-check the live provider.
  decryptSecret(cred.encryptedKey);
  const client = await getProvider(workspace.id, p);
  const res = await client.healthCheck();
  await prisma.userProviderCredential.update({
    where: { id: cred.id },
    data: { lastValidatedAt: res.ok ? new Date() : cred.lastValidatedAt },
  });
  return { ok: res.ok };
}
