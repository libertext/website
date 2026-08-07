import { AppError } from "@/lib/ai/errors";

const DEFAULT_TIMEOUT_MS = 120_000; // AI requests must not hang forever (§150)

/** fetch with timeout + provider error classification. */
export async function providerFetch(
  url: string,
  init: RequestInit,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403)
        throw new AppError("PROVIDER_AUTH_FAILED", { cause: body });
      if (res.status === 429)
        throw new AppError("PROVIDER_RATE_LIMIT", { retryable: true, cause: body });
      if (res.status >= 500)
        throw new AppError("PROVIDER_UNAVAILABLE", { retryable: true, cause: body });
      throw new AppError("GENERATION_FAILED", { cause: body });
    }
    return res;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === "AbortError")
      throw new AppError("PROVIDER_TIMEOUT", { retryable: true, cause: err });
    throw new AppError("PROVIDER_UNAVAILABLE", { retryable: true, cause: err });
  } finally {
    clearTimeout(timeout);
  }
}
