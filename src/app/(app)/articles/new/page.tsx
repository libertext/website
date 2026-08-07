import { getActiveWorkspace } from "@/lib/auth/current";
import { prisma } from "@/lib/db/prisma";
import { availableProviders } from "@/lib/ai/registry";
import { NewArticleForm } from "@/components/articles/new-article-form";

export const metadata = { title: "Yeni Makale" };

export default async function NewArticlePage() {
  const { workspace } = await getActiveWorkspace();

  const [projects, models, avail] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.aIModel.findMany({
      where: { active: true, deprecated: false },
      select: { provider: true, externalModelId: true, displayName: true, qualityTier: true },
      orderBy: [{ provider: "asc" }, { sortOrder: "asc" }],
    }),
    availableProviders(workspace.id),
  ]);

  // Only show models whose provider is usable right now (§232).
  const usableModels = models.filter((m) => avail[m.provider as keyof typeof avail]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Yeni Makale</h1>
        <p className="text-sm text-muted-foreground">
          Konunu yaz, modeli seç ve makaleyi oluştur. Anahtar kelime zorunlu değil.
        </p>
      </div>
      <NewArticleForm projects={projects} models={usableModels} />
    </div>
  );
}
