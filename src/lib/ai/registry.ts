import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/config/env";
import { decryptSecret } from "@/lib/crypto/encryption";
import { AppError } from "@/lib/ai/errors";
import type { AIProvider } from "@/lib/ai/types";
import type { PriceLookup } from "@/lib/ai/cost";
import { MockAIProvider } from "@/lib/ai/providers/mock";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { GeminiProvider } from "@/lib/ai/providers/gemini";

export type ProviderId = "mock" | "openai" | "anthropic" | "gemini";

/** Build a price lookup backed by the AIModel registry (§15, §162). */
async function priceLookupFor(provider: string): Promise<PriceLookup> {
  const models = await prisma.aIModel.findMany({
    where: { provider },
    select: { externalModelId: true, inputPricePerMTok: true, outputPricePerMTok: true },
  });
  const map = new Map(models.map((m) => [m.externalModelId, m]));
  return (modelId: string) => {
    const m = map.get(modelId);
    return m
      ? { inputPricePerMTok: m.inputPricePerMTok, outputPricePerMTok: m.outputPricePerMTok }
      : undefined;
  };
}

/**
 * Resolve an AIProvider for a workspace.
 * Key precedence: workspace BYOK credential (§17) → platform-managed env key.
 * Never returns keys to callers; the provider closes over them server-side (§17, §198).
 */
export async function getProvider(
  workspaceId: string,
  providerId: ProviderId,
): Promise<AIProvider> {
  if (providerId === "mock") return new MockAIProvider();

  const env = getEnv();
  const priceLookup = await priceLookupFor(providerId);

  // BYOK first.
  const cred = await prisma.userProviderCredential.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: providerId } },
  });
  let apiKey: string | undefined;
  if (cred?.active) {
    apiKey = decryptSecret(cred.encryptedKey);
  } else {
    apiKey =
      providerId === "openai"
        ? env.OPENAI_API_KEY
        : providerId === "anthropic"
          ? env.ANTHROPIC_API_KEY
          : env.GEMINI_API_KEY;
  }

  if (!apiKey) {
    throw new AppError("PROVIDER_AUTH_FAILED", {
      message: `No API key configured for provider ${providerId}`,
    });
  }

  switch (providerId) {
    case "openai":
      return new OpenAIProvider(apiKey, priceLookup);
    case "anthropic":
      return new AnthropicProvider(apiKey, priceLookup);
    case "gemini":
      return new GeminiProvider(apiKey, priceLookup);
  }
}

/** Which providers are usable right now (platform key present OR workspace BYOK) (§232). */
export async function availableProviders(workspaceId: string): Promise<Record<ProviderId, boolean>> {
  const env = getEnv();
  const creds = await prisma.userProviderCredential.findMany({
    where: { workspaceId, active: true },
    select: { provider: true },
  });
  const byok = new Set(creds.map((c) => c.provider));
  return {
    mock: true,
    openai: Boolean(env.OPENAI_API_KEY) || byok.has("openai"),
    anthropic: Boolean(env.ANTHROPIC_API_KEY) || byok.has("anthropic"),
    gemini: Boolean(env.GEMINI_API_KEY) || byok.has("gemini"),
  };
}
