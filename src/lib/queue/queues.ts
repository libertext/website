import { Queue } from "bullmq";
import { z } from "zod";
import { getRedis } from "@/lib/queue/connection";

/** Standard background job names (§147). Payloads validated with Zod. */
export const JOB = {
  articleGenerate: "article.generate-draft",
  articlePublish: "article.publish-wordpress",
  wordpressSync: "wordpress.sync",
  bulkDispatch: "bulk.dispatch",
  bulkItem: "bulk.item",
  mediaUpload: "media.upload",
} as const;

export const QUEUE_NAMES = {
  generation: "generation",
  publish: "publish",
  bulk: "bulk",
  sync: "sync",
} as const;

// Payload schemas (§147).
export const articleGeneratePayload = z.object({
  workspaceId: z.string(),
  articleId: z.string(),
  userId: z.string().optional(),
  provider: z.enum(["mock", "openai", "anthropic", "gemini"]),
  modelId: z.string(),
  idempotencyKey: z.string(),
  lengthPreference: z.string().optional(),
  input: z.object({
    topic: z.string(),
    primaryKeyword: z.string().optional(),
    secondaryKeywords: z.array(z.string()).optional(),
    language: z.string(),
    targetCountry: z.string(),
    writingProfileText: z.string().optional(),
    customInstructions: z.string().optional(),
    fast: z.boolean().optional(),
  }),
});
export type ArticleGeneratePayload = z.infer<typeof articleGeneratePayload>;

export const bulkItemPayload = z.object({
  workspaceId: z.string(),
  bulkJobId: z.string(),
  bulkJobItemId: z.string(),
});
export type BulkItemPayload = z.infer<typeof bulkItemPayload>;

// Reusable default job options: retry only retryable errors via backoff (§149).
export const DEFAULT_JOB_OPTS = {
  attempts: 4,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

let _generation: Queue | null = null;
let _bulk: Queue | null = null;

export function generationQueue(): Queue {
  return (_generation ??= new Queue(QUEUE_NAMES.generation, { connection: getRedis() }));
}
export function bulkQueue(): Queue {
  return (_bulk ??= new Queue(QUEUE_NAMES.bulk, { connection: getRedis() }));
}
