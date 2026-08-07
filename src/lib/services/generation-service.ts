import type { ArticleStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getProvider, type ProviderId } from "@/lib/ai/registry";
import { runArticlePipeline, type PipelineInput } from "@/lib/generation/pipeline";
import { assembleArticleHtml } from "@/lib/articles/assemble";
import { analyzeSeo } from "@/lib/seo/analyze";
import { CreditService, estimateGenerationCredits } from "@/lib/services/credit-service";
import { PROMPT_VERSION } from "@/lib/prompts/templates";
import { AppError } from "@/lib/ai/errors";

export interface GenerateArticleParams {
  workspaceId: string;
  articleId: string;
  userId?: string;
  provider: ProviderId;
  modelId: string;
  input: PipelineInput;
  lengthPreference?: string;
  /** Idempotency root — a retried queue job reuses it so credits charge once (§81). */
  idempotencyKey: string;
}

/**
 * Orchestrates a full article generation for an existing Article row (§31, §80).
 * Charges credits up-front (idempotent), runs the pipeline, records per-step AIUsage,
 * and refunds on failure (§19). Never double-charges on retry.
 */
export const GenerationService = {
  async generateArticle(params: GenerateArticleParams): Promise<void> {
    const credits = estimateGenerationCredits(params.lengthPreference ?? "STANDARD");

    await CreditService.ensureQuota(params.workspaceId, credits);
    await prisma.article.update({
      where: { id: params.articleId },
      data: { status: "GENERATING" },
    });

    // Charge once; idempotent on the job's key.
    await CreditService.charge(params.workspaceId, credits, {
      description: `Article generation ${params.articleId}`,
      idempotencyKey: `charge:${params.idempotencyKey}`,
    });

    const modelRow = await prisma.aIModel.findUnique({
      where: { provider_externalModelId: { provider: params.provider, externalModelId: params.modelId } },
    });

    try {
      const provider = await getProvider(params.workspaceId, params.provider);
      const result = await runArticlePipeline(provider, params.modelId, params.input);

      const html = assembleArticleHtml(result.article);
      const seo = analyzeSeo({
        title: result.article.title,
        metaTitle: result.meta.metaTitle,
        metaDescription: result.meta.metaDescription,
        slug: result.meta.slug,
        focusKeyword: result.article.primaryKeyword,
        contentHtml: html,
      });

      // Record usage per pipeline step (§18).
      for (const step of result.steps) {
        const cost = provider.estimateCost({
          modelId: params.modelId,
          inputTokens: step.usage.inputTokens,
          outputTokens: step.usage.outputTokens,
        });
        await prisma.aIUsage.create({
          data: {
            workspaceId: params.workspaceId,
            userId: params.userId,
            articleId: params.articleId,
            provider: params.provider,
            modelId: params.modelId,
            modelDisplayName: modelRow?.displayName ?? params.modelId,
            inputTokens: step.usage.inputTokens,
            cachedInputTokens: step.usage.cachedInputTokens,
            outputTokens: step.usage.outputTokens,
            reasoningTokens: step.usage.reasoningTokens,
            estimatedProviderCostMicro: cost.totalMicroUsd,
            chargedCredits: 0,
            status: "SUCCESS",
          },
        });
      }

      const status: ArticleStatus = "GENERATED";
      await prisma.$transaction([
        prisma.article.update({
          where: { id: params.articleId },
          data: {
            title: result.article.title,
            slug: result.meta.slug,
            excerpt: result.meta.excerpt,
            contentHtml: html,
            metaTitle: result.meta.metaTitle,
            metaDescription: result.meta.metaDescription,
            focusKeyword: result.article.primaryKeyword,
            searchIntent: result.brief?.searchIntent,
            faq: result.article.faq,
            seoScore: seo.score,
            status,
          },
        }),
        prisma.articleVersion.create({
          data: {
            articleId: params.articleId,
            source: "AI_GENERATION",
            title: result.article.title,
            contentHtml: html,
            createdById: params.userId,
            metadata: { promptVersion: PROMPT_VERSION, seoScore: seo.score },
          },
        }),
      ]);
    } catch (err) {
      // Refund the charge; keep the article recoverable (§19, §210).
      await CreditService.refund(params.workspaceId, credits, {
        description: `Refund failed generation ${params.articleId}`,
        idempotencyKey: `refund:${params.idempotencyKey}`,
      });
      await prisma.article.update({
        where: { id: params.articleId },
        data: { status: "LOCAL_DRAFT" },
      });
      if (err instanceof AppError) throw err;
      throw new AppError("GENERATION_FAILED", { cause: err });
    }
  },
};
