import { Worker, type Job } from "bullmq";
import { getRedis } from "../src/lib/queue/connection";
import {
  QUEUE_NAMES,
  JOB,
  articleGeneratePayload,
  bulkItemPayload,
} from "../src/lib/queue/queues";
import { GenerationService } from "../src/lib/services/generation-service";
import { processBulkItem } from "./processors/bulk-item";

/**
 * Standalone worker process (§3). Runs AI generation off the HTTP request path.
 * Concurrency is bounded; BullMQ persists jobs so a restart doesn't lose work (§233).
 * SIGTERM triggers graceful shutdown of in-flight jobs (§234).
 */
const connection = getRedis();
const workers: Worker[] = [];

workers.push(
  new Worker(
    QUEUE_NAMES.generation,
    async (job: Job) => {
      if (job.name === JOB.articleGenerate) {
        const data = articleGeneratePayload.parse(job.data);
        await GenerationService.generateArticle(data);
      }
    },
    { connection, concurrency: 4 },
  ),
);

workers.push(
  new Worker(
    QUEUE_NAMES.bulk,
    async (job: Job) => {
      if (job.name === JOB.bulkItem) {
        const data = bulkItemPayload.parse(job.data);
        await processBulkItem(data);
      }
    },
    { connection, concurrency: 4 },
  ),
);

for (const w of workers) {
  w.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} (${job?.name}) failed:`, err.message);
  });
  w.on("completed", (job) => {
    console.log(`[worker] job ${job.id} (${job.name}) completed`);
  });
}

console.log("[worker] started; listening on generation + bulk queues");

async function shutdown() {
  console.log("[worker] SIGTERM received, closing workers...");
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
