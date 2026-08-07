import Link from "next/link";
import { getActiveWorkspace } from "@/lib/auth/current";
import { ArticleService } from "@/lib/services/article-service";
import { Card, CardContent, Badge } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { statusBadge } from "@/components/app/status-badge";

export const metadata = { title: "Makaleler" };

export default async function ArticlesPage() {
  const { workspace } = await getActiveWorkspace();
  const articles = await ArticleService.list(workspace.id, { take: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Makaleler</h1>
        <Link href="/articles/new" className={buttonVariants()}>
          Yeni Makale
        </Link>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Henüz makalen yok.</p>
            <Link href="/articles/new" className={`${buttonVariants()} mt-4`}>
              İlk Makaleni Oluştur
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Başlık</th>
                  <th className="p-3 font-medium">Proje</th>
                  <th className="p-3 font-medium">Durum</th>
                  <th className="p-3 font-medium">SEO</th>
                  <th className="p-3 font-medium">Güncellendi</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const badge = statusBadge(a.status);
                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="p-3">
                        <Link href={`/articles/${a.id}`} className="font-medium hover:underline">
                          {a.title || "(başlıksız)"}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{a.project?.name ?? "—"}</td>
                      <td className="p-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{a.seoScore ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {a.updatedAt.toLocaleDateString("tr")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
