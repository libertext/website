import { prisma } from "@/lib/db/prisma";
import { randomToken } from "@/lib/crypto/encryption";
import { bulkQueue, JOB, DEFAULT_JOB_OPTS } from "@/lib/queue/queues";
import { GenerationService } from "@/lib/services/generation-service";
import { processBulkItem as inlineProcess } from "@/lib/services/bulk-inline";

/** Distribute schedule times deterministically so posts don't collide (§177). */
export function distributeSchedule(start: Date, count: number, perDay: number): Date[] {
  const times: Date[] = [];
  const hours = [9, 13, 17, 20];
  for (let i = 0; i < count; i++) {
    const day = Math.floor(i / perDay);
    const slot = i % perDay;
    const d = new Date(start);
    d.setDate(d.getDate() + day);
    d.setHours(hours[slot % hours.length] ?? 9, 0, 0, 0);
    times.push(d);
  }
  return times;
}

export const BulkService = {
  /** Create a bulk job from a list of topics and enqueue each item (§47, §49). */
  async createFromTopics(params: {
    workspaceId: string;
    projectId?: string;
    createdById: string;
    name: string;
    provider: string;
    modelId: string;
    topics: string[];
  }) {
    const topics = params.topics.map((t) => t.trim()).filter(Boolean);
    if (topics.length === 0) throw new Error("En az bir konu girin.");

    const job = await prisma.bulkJob.create({
      data: {
        workspaceId: params.workspaceId,
        projectId: params.projectId,
        createdById: params.createdById,
        name: params.name,
        provider: params.provider,
        modelId: params.modelId,
        status: "RUNNING",
        totalItems: topics.length,
        items: {
          create: topics.map((topic, i) => ({
            position: i,
            topic,
            idempotencyKey: randomToken(12), // dedupe on retry (§52)
          })),
        },
      },
      include: { items: true },
    });

    // Enqueue each item; fall back to inline processing if Redis is down.
    for (const item of job.items) {
      const payload = { workspaceId: params.workspaceId, bulkJobId: job.id, bulkJobItemId: item.id };
      try {
        await bulkQueue().add(JOB.bulkItem, payload, DEFAULT_JOB_OPTS);
      } catch {
        // Inline fallback keeps small setups working without a worker.
        void inlineProcess(payload).catch((e) => console.error("[bulk] inline item failed", e));
      }
    }
    return job;
  },
};

// Re-export for the worker path.
export { GenerationService };
