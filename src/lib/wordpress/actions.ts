"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getActiveWorkspace } from "@/lib/auth/current";
import { requireWorkspace } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/crypto/encryption";
import { assertSafeWordPressUrl } from "@/lib/wordpress/ssrf";
import { audit } from "@/lib/services/audit";
import { AppError } from "@/lib/ai/errors";

const schema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(1),
});

/**
 * Connect a WordPress site via the Application Password fallback (§10).
 * Validates the URL against SSRF rules, verifies the credential with a live REST
 * call, then stores the credential encrypted (never plaintext) (§7, §10).
 */
export async function connectAppPasswordSite(formData: FormData) {
  const { user, workspace } = await getActiveWorkspace();
  await requireWorkspace(workspace.id, "ADMIN");

  const data = schema.parse({
    name: formData.get("name"),
    url: formData.get("url"),
    username: formData.get("username"),
    appPassword: formData.get("appPassword"),
  });

  const base = await assertSafeWordPressUrl(data.url); // SSRF (§9)

  // Verify credentials against the WP REST API.
  const auth = Buffer.from(`${data.username}:${data.appPassword}`).toString("base64");
  const meRes = await fetch(new URL("/wp-json/wp/v2/users/me?context=edit", base), {
    headers: { Authorization: `Basic ${auth}` },
    redirect: "manual",
  }).catch(() => {
    throw new AppError("WORDPRESS_CONNECTION_FAILED");
  });
  if (meRes.status === 401 || meRes.status === 403) throw new AppError("WORDPRESS_AUTH_FAILED");
  if (!meRes.ok) throw new AppError("WORDPRESS_CONNECTION_FAILED");

  const secret = encryptSecret(JSON.stringify({ username: data.username, appPassword: data.appPassword }));

  const site = await prisma.wordPressSite.create({
    data: {
      workspaceId: workspace.id,
      name: data.name,
      url: base.origin,
      mode: "APP_PASSWORD",
      health: "CONNECTED",
      encryptedSecret: secret,
      lastHealthyAt: new Date(),
    },
  });
  await audit({ workspaceId: workspace.id, actorUserId: user.id, action: "SITE_CONNECTED", targetType: "wordpress_site", targetId: site.id });
  redirect("/sites");
}
