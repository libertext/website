import { prisma } from "@/lib/db/prisma";
import { GenerationService } from "@/lib/services/generation-service";
import { renderWritingProfile } from "@/lib/articles/writing-profile";
import type { ProviderId } from "@/lib/ai/registry";

export interface BulkItemJob {
  workspaceId: string;
  bulkJobId: string;
  bulkJobItemId: string;
}

/**
 * Generate one bulk item into an Article (§50). Shared by the worker and the
 * inline fallback. Idempotent: a COMPLETED item is skipped on retry (§52).
 */
export async function processBulkItem(data: BulkItemJob): Promise<void> {
  const item = await prisma.bulkJobItem.findUnique({
    where: { id: data.bulkJobItemId },
    include: { bulkJob: { include: { project: { include: { writingProfile: true } } } } },
  });
  if (!item || item.status === "COMPLETED") return;

  const job = item.bulkJob;
  await prisma.bulkJobItem.update({ where: { id: item.id }, data: { status: "GENERATING" } });

  let article = await prisma.article.findFirst({ where: { bulkJobItemId: item.id } });
  if (!article) {
    article = await prisma.article.create({
      data: {
        workspaceId: data.workspaceId,
        projectId: job.projectId,
        wordpressSiteId: job.project?.wordpressSiteId,
        title: item.topic,
        status: "GENERATING",
        bulkJobItemId: item.id,
        createdById: job.createdById,
      },
    });
  }

  try {
    await GenerationService.generateArticle({
      workspaceId: data.workspaceId,
      articleId: article.id,
      userId: job.createdById ?? undefined,
      provider: job.provider as ProviderId,
      modelId: job.modelId,
      idempotencyKey: item.idempotencyKey,
      input: {
        topic: item.topic,
        primaryKeyword: item.primaryKeyword ?? undefined,
        secondaryKeywords: item.secondaryKeywords,
        language: job.project?.language ?? "tr",
        targetCountry: job.project?.targetCountry ?? "TR",
        writingProfileText: renderWritingProfile(job.project?.writingProfile),
        customInstructions: item.customInstruction ?? job.project?.customInstructions ?? undefined,
      },
    });
    await prisma.$transaction([
      prisma.bulkJobItem.update({ where: { id: item.id }, data: { status: "COMPLETED" } }),
      prisma.bulkJob.update({ where: { id: job.id }, data: { completedItems: { increment: 1 } } }),
    ]);
  } catch (err) {
    await prisma.$transaction([
      prisma.bulkJobItem.update({
        where: { id: item.id },
        data: { status: "FAILED", error: err instanceof Error ? err.message : "error" },
      }),
      prisma.bulkJob.update({ where: { id: job.id }, data: { failedItems: { increment: 1 } } }),
    ]);
    throw err;
  } finally {
    await reconcileJobStatus(job.id);
  }
}

async function reconcileJobStatus(bulkJobId: string): Promise<void> {
  const job = await prisma.bulkJob.findUnique({ where: { id: bulkJobId } });
  if (!job) return;
  if (job.completedItems + job.failedItems < job.totalItems) return;
  const status =
    job.failedItems === 0 ? "COMPLETED" : job.completedItems === 0 ? "FAILED" : "PARTIALLY_COMPLETED";
  await prisma.bulkJob.update({ where: { id: bulkJobId }, data: { status } });
}
