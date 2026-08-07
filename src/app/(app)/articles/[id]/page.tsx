import { getActiveWorkspace } from "@/lib/auth/current";
import { ArticleService } from "@/lib/services/article-service";
import { analyzeSeo } from "@/lib/seo/analyze";
import { ArticleEditor } from "@/components/articles/article-editor";
import { GeneratingView } from "@/components/articles/generating-view";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await getActiveWorkspace();
  const article = await ArticleService.get(workspace.id, id);

  if (article.status === "GENERATING") {
    return <GeneratingView title={article.title} />;
  }

  const seo = analyzeSeo({
    title: article.title,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    slug: article.slug,
    focusKeyword: article.focusKeyword,
    contentHtml: article.contentHtml,
  });

  return (
    <ArticleEditor
      article={{
        id: article.id,
        title: article.title,
        contentHtml: article.contentHtml,
        metaTitle: article.metaTitle ?? "",
        metaDescription: article.metaDescription ?? "",
        slug: article.slug ?? "",
        status: article.status,
        wpPermalink: article.wpPermalink,
      }}
      initialSeo={seo}
    />
  );
}
