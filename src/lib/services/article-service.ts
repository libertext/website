import type { ArticleStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/ai/errors";
import { sanitizeArticleHtml } from "@/lib/seo/sanitize";

/**
 * Article data access. EVERY read/write is scoped by workspaceId so a caller can
 * never touch another tenant's articles (§5). Callers must have already passed
 * requireWorkspace() to obtain the workspaceId.
 */
export const ArticleService = {
  async list(
    workspaceId: string,
    opts: { status?: ArticleStatus; projectId?: string; take?: number; cursor?: string } = {},
  ) {
    const where: Prisma.ArticleWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
    };
    return prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: opts.take ?? 50,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      select: {
        id: true,
        title: true,
        status: true,
        seoScore: true,
        updatedAt: true,
        scheduledAt: true,
        publishedAt: true,
        project: { select: { name: true } },
      },
    });
  },

  /** Fetch one article, enforcing tenant ownership (§5, IDOR defense §74). */
  async get(workspaceId: string, id: string) {
    const article = await prisma.article.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { project: true, wordpressSite: true },
    });
    if (!article) throw new AppError("NOT_FOUND");
    return article;
  },

  async createDraft(
    workspaceId: string,
    data: {
      title: string;
      projectId?: string;
      wordpressSiteId?: string;
      createdById?: string;
      focusKeyword?: string;
      status?: ArticleStatus;
    },
  ) {
    return prisma.article.create({
      data: {
        workspaceId,
        title: data.title,
        projectId: data.projectId,
        wordpressSiteId: data.wordpressSiteId,
        createdById: data.createdById,
        focusKeyword: data.focusKeyword,
        // Mark GENERATING up-front when a generation is about to be dispatched so the
        // editor shows the progress view immediately — no empty-content flash (§62).
        status: data.status ?? "LOCAL_DRAFT",
      },
    });
  },

  /** Save editor content; sanitizes HTML and snapshots a version (§33, §36, §75). */
  async saveContent(
    workspaceId: string,
    id: string,
    data: { title?: string; contentHtml?: string; metaTitle?: string; metaDescription?: string; slug?: string },
    userId?: string,
  ) {
    const article = await this.get(workspaceId, id);
    const contentHtml =
      data.contentHtml !== undefined ? sanitizeArticleHtml(data.contentHtml) : article.contentHtml;

    const [updated] = await prisma.$transaction([
      prisma.article.update({
        where: { id: article.id },
        data: {
          title: data.title ?? article.title,
          contentHtml,
          metaTitle: data.metaTitle ?? article.metaTitle,
          metaDescription: data.metaDescription ?? article.metaDescription,
          slug: data.slug ?? article.slug,
          status: article.status === "GENERATED" ? "EDITING" : article.status,
        },
      }),
      prisma.articleVersion.create({
        data: {
          articleId: article.id,
          source: "USER_EDIT",
          title: data.title ?? article.title,
          contentHtml,
          createdById: userId,
        },
      }),
    ]);
    return updated;
  },

  /** Soft-delete to trash (§169). */
  async trash(workspaceId: string, id: string) {
    await this.get(workspaceId, id); // ownership check
    await prisma.article.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
