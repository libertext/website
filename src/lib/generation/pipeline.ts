import type { AIProvider, TokenUsage } from "@/lib/ai/types";
import { buildMessages, type PromptContext } from "@/lib/prompts/engine";
import { TASK_INSTRUCTIONS } from "@/lib/prompts/templates";
import {
  briefSchema,
  outlineSchema,
  articleSchema,
  metaSchema,
  type Brief,
  type Outline,
  type ArticlePayload,
  type Meta,
} from "@/lib/ai/schemas";

export interface PipelineInput {
  topic: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  language: string;
  targetCountry: string;
  writingProfileText?: string;
  customInstructions?: string;
  sources?: { title?: string; url: string; excerpt?: string }[];
  /** Skip brief/outline for a fast path (§31). */
  fast?: boolean;
}

export interface PipelineStep {
  type: string;
  usage: TokenUsage;
}

export interface PipelineResult {
  brief?: Brief;
  outline?: Outline;
  article: ArticlePayload;
  meta: Meta;
  steps: PipelineStep[];
}

function baseCtx(input: PipelineInput): Omit<PromptContext, "taskInstruction" | "userContent"> {
  return {
    writingProfile: input.writingProfileText,
    customInstructions: input.customInstructions,
    sources: input.sources,
  };
}

function topicBlock(input: PipelineInput): string {
  const lines = [`Konu: ${input.topic}`, `Dil: ${input.language}`, `Hedef ülke: ${input.targetCountry}`];
  if (input.primaryKeyword) lines.push(`Birincil anahtar kelime: ${input.primaryKeyword}`);
  if (input.secondaryKeywords?.length)
    lines.push(`İkincil anahtar kelimeler: ${input.secondaryKeywords.join(", ")}`);
  return lines.join("\n");
}

/**
 * The controlled generation pipeline (§31): normalize → brief → outline → draft → meta.
 * Provider-driven; works fully with MockAIProvider so it is unit-testable with no key.
 */
export async function runArticlePipeline(
  provider: AIProvider,
  modelId: string,
  input: PipelineInput,
  signal?: AbortSignal,
): Promise<PipelineResult> {
  const steps: PipelineStep[] = [];
  const ctx = baseCtx(input);
  const topic = topicBlock(input);

  let brief: Brief | undefined;
  let outline: Outline | undefined;

  if (!input.fast) {
    const briefRes = await provider.generateStructured({
      modelId,
      schema: briefSchema,
      schemaName: "brief",
      signal,
      messages: buildMessages({
        ...ctx,
        taskInstruction: TASK_INSTRUCTIONS.brief,
        userContent: topic,
      }),
    });
    brief = briefRes.data;
    steps.push({ type: "BRIEF", usage: briefRes.usage });

    const outlineRes = await provider.generateStructured({
      modelId,
      schema: outlineSchema,
      schemaName: "outline",
      signal,
      messages: buildMessages({
        ...ctx,
        taskInstruction: TASK_INSTRUCTIONS.outline,
        userContent: `${topic}\n\nBrief:\n${JSON.stringify(brief)}`,
      }),
    });
    outline = outlineRes.data;
    steps.push({ type: "OUTLINE", usage: outlineRes.usage });
  }

  const draftRes = await provider.generateStructured({
    modelId,
    schema: articleSchema,
    schemaName: "article",
    signal,
    messages: buildMessages({
      ...ctx,
      taskInstruction: TASK_INSTRUCTIONS.draft,
      userContent: [
        topic,
        brief ? `\nBrief:\n${JSON.stringify(brief)}` : "",
        outline ? `\nOutline:\n${JSON.stringify(outline)}` : "",
      ].join("\n"),
    }),
  });
  const article = draftRes.data;
  steps.push({ type: "DRAFT", usage: draftRes.usage });

  const metaRes = await provider.generateStructured({
    modelId,
    schema: metaSchema,
    schemaName: "meta",
    signal,
    messages: buildMessages({
      ...ctx,
      taskInstruction: TASK_INSTRUCTIONS.meta,
      userContent: `${topic}\n\nBaşlık: ${article.title}\nÖzet: ${article.excerpt}`,
    }),
  });
  steps.push({ type: "META", usage: metaRes.usage });

  return { brief, outline, article, meta: metaRes.data, steps };
}
