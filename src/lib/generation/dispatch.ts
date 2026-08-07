import "server-only";
import { randomToken } from "@/lib/crypto/encryption";
import { generationQueue, JOB, DEFAULT_JOB_OPTS, type ArticleGeneratePayload } from "@/lib/queue/queues";
import { GenerationService } from "@/lib/services/generation-service";

/**
 * Dispatch an article generation. Prefers the BullMQ queue so heavy AI work runs
 * off the request path in the worker (§3). If Redis is unreachable (e.g. a minimal
 * single-node dev setup), it falls back to inline execution so the product still
 * works — logged loudly so operators know the worker isn't wired up.
 */
export async function dispatchGeneration(payload: Omit<ArticleGeneratePayload, "idempotencyKey">) {
  const full: ArticleGeneratePayload = { ...payload, idempotencyKey: randomToken(12) };

  // Single-service mode: run in-process, no worker required (§3 alt path).
  if (process.env.GENERATION_MODE === "inline") {
    await GenerationService.generateArticle(full);
    return { mode: "inline" as const };
  }

  try {
    await generationQueue().add(JOB.articleGenerate, full, DEFAULT_JOB_OPTS);
    return { mode: "queued" as const };
  } catch (err) {
    console.warn(
      "[dispatch] queue unavailable, running generation inline. Start the worker for production.",
      err instanceof Error ? err.message : err,
    );
    await GenerationService.generateArticle(full);
    return { mode: "inline" as const };
  }
}
