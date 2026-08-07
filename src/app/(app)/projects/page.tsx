import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/auth/current";
import { requireWorkspace } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Projeler" };

export default async function ProjectsPage() {
  const { workspace } = await getActiveWorkspace();
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    include: { wordpressSite: { select: { name: true } }, _count: { select: { articles: true } } },
    orderBy: { createdAt: "desc" },
  });

  async function createProject(formData: FormData) {
    "use server";
    const { workspace: ws } = await getActiveWorkspace();
    await requireWorkspace(ws.id, "ADMIN");
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    await prisma.project.create({
      data: { workspaceId: ws.id, name, language: "tr", targetCountry: "TR", preferredProvider: "mock", preferredModelId: "mock-standard" },
    });
    redirect("/projects");
  }

  return (
    <div>
      <PageHeader title="Projeler" description="İçeriklerini konu ve marka bazında grupla." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-0">
            {projects.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">Henüz projen yok.</p>
            ) : (
              <ul className="divide-y">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p._count.articles} makale · {p.wordpressSite?.name ?? "Site bağlı değil"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <form action={createProject} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Yeni proje</Label>
                <Input id="name" name="name" placeholder="Örn. Ceza Hukuku Blogu" required />
              </div>
              <Button type="submit" className="w-full">Proje oluştur</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
