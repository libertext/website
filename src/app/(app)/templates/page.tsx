import { getActiveWorkspace } from "@/lib/auth/current";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/primitives";

export const metadata = { title: "Şablonlar" };

export default async function TemplatesPage() {
  const { workspace } = await getActiveWorkspace();
  const templates = await prisma.contentTemplate.findMany({ where: { workspaceId: workspace.id } });
  return (
    <div>
      <PageHeader title="İçerik Şablonları" description="Yeniden kullanılabilir makale şablonları." />
      <Card>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Henüz şablon yok.</p>
          ) : (
            <ul className="divide-y">
              {templates.map((t) => (
                <li key={t.id} className="p-4 font-medium">{t.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
