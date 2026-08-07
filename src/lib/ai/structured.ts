import type { z } from "zod";
import { AppError } from "@/lib/ai/errors";

/**
 * Extract and validate a JSON object from a model's raw text (§32).
 * Providers sometimes wrap JSON in prose or ```json fences — strip those first,
 * then validate against the Zod schema. Throws INVALID_RESPONSE (retryable) on failure.
 */
export function parseStructured<T>(raw: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  const candidate = extractJson(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(candidate);
  } catch {
    throw new AppError("INVALID_RESPONSE", { retryable: true, message: "Model did not return valid JSON" });
  }
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    throw new AppError("INVALID_RESPONSE", {
      retryable: true,
      message: `Structured output failed validation: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    });
  }
  return parsed.data;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  // Strip ```json ... ``` fences.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  // Grab the outermost {...} or [...] block.
  const firstBrace = trimmed.search(/[{[]/);
  if (firstBrace >= 0) {
    const lastBrace = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}
