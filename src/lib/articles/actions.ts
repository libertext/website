"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveWorkspace } from "@/lib/auth/current";
import { requireWorkspace } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { ArticleService } from "@/lib/services/article-service";
import { dispatchGeneration } from "@/lib/generation/dispatch";
import { renderWritingProfile } from "@/lib/articles/writing-profile";
import { availableProviders, type ProviderId } from "@/lib/ai/registry";
import { analyzeSeo } from "@/lib/seo/analyze";

const newArticleSchema = z.object({
  topic: z.string().min(3, "Konu en az 3 karakter olmalı"),
  primaryKeyword: z.string().optional(),
  projectId: z.string().optional(),
  provider: z.enum(["mock", "openai", "anthropic", "gemini"]),
  modelId: z.string().min(1),
  fast: z.coerce.boolean().optional(),
});

/** Create a draft + dispatch generation, then open the editor (FLOW A). */
export async function createArticleAction(formData: FormData): Promise<void> {
  const { user, workspace } = await getActiveWorkspace();
  await requireWorkspace(workspace.id, "EDITOR");

  const parsed = newArticleSchema.safeParse({
    topic: formData.get("topic"),
    primaryKeyword: formData.get("primaryKeyword") || undefined,
    projectId: formData.get("projectId") || undefined,
    provider: formData.get("provider"),
    modelId: formData.get("modelId"),
    fast: formData.get("fast") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  // Verify the provider is actually usable for this workspace (§232).
  const avail = await availableProviders(workspace.id);
  if (!avail[parsed.data.provider as ProviderId]) {
    throw new Error("Seçilen sağlayıcı şu an kullanılamıyor.");
  }

  const project = parsed.data.projectId
    ? await prisma.project.findFirst({
        where: { id: parsed.data.projectId, workspaceId: workspace.id },
        include: { writingProfile: true },
      })
    : null;

  const draft = await ArticleService.createDraft(workspace.id, {
    title: parsed.data.topic,
    projectId: project?.id,
    wordpressSiteId: project?.wordpressSiteId ?? undefined,
    createdById: user.id,
    focusKeyword: parsed.data.primaryKeyword,
  });

  await dispatchGeneration({
    workspaceId: workspace.id,
    articleId: draft.id,
    userId: user.id,
    provider: parsed.data.provider,
    modelId: parsed.data.modelId,
    lengthPreference: "STANDARD",
    input: {
      topic: parsed.data.topic,
      primaryKeyword: parsed.data.primaryKeyword,
      language: project?.language ?? "tr",
      targetCountry: project?.targetCountry ?? "TR",
      writingProfileText: renderWritingProfile(project?.writingProfile),
      customInstructions: project?.customInstructions ?? undefined,
      fast: parsed.data.fast,
    },
  });

  redirect(`/articles/${draft.id}`);
}

const saveSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentHtml: z.string(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  slug: z.string().optional(),
});

/** Autosave from the editor (§33, §173). Returns fresh SEO analysis. */
export async function saveArticleAction(input: z.infer<typeof saveSchema>) {
  const { user, workspace } = await getActiveWorkspace();
  await requireWorkspace(workspace.id, "EDITOR");
  const parsed = saveSchema.parse(input);
  const updated = await ArticleService.saveContent(
    workspace.id,
    parsed.id,
    {
      title: parsed.title,
      contentHtml: parsed.contentHtml,
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
      slug: parsed.slug,
    },
    user.id,
  );
  const seo = analyzeSeo({
    title: updated.title,
    metaTitle: updated.metaTitle,
    metaDescription: updated.metaDescription,
    slug: updated.slug,
    focusKeyword: updated.focusKeyword,
    contentHtml: updated.contentHtml,
  });
  await prisma.article.update({ where: { id: updated.id }, data: { seoScore: seo.score } });
  revalidatePath(`/articles/${updated.id}`);
  return { ok: true, seo };
}
