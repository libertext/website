import type { CostEstimate } from "@/lib/ai/types";

/** Per-model price in USD micro-units per 1M tokens (from the AIModel registry). */
export interface ModelPricing {
  inputPricePerMTok: number;
  outputPricePerMTok: number;
}

export type PriceLookup = (modelId: string) => ModelPricing | undefined;

/** Compute provider cost in USD micro-units (integer, precision-safe) (§161). */
export function computeCost(
  pricing: ModelPricing | undefined,
  inputTokens: number,
  outputTokens: number,
): CostEstimate {
  if (!pricing) return { inputMicroUsd: 0, outputMicroUsd: 0, totalMicroUsd: 0 };
  const inputMicroUsd = Math.round((inputTokens * pricing.inputPricePerMTok) / 1_000_000);
  const outputMicroUsd = Math.round((outputTokens * pricing.outputPricePerMTok) / 1_000_000);
  return { inputMicroUsd, outputMicroUsd, totalMicroUsd: inputMicroUsd + outputMicroUsd };
}
