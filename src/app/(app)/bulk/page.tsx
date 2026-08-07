import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/auth/current";
import { requireWorkspace } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { BulkService } from "@/lib/services/bulk-service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Toplu İçerik" };

export default async function BulkPage() {
  const { workspace } = await getActiveWorkspace();
  const [jobs, projects, models] = await Promise.all([
    prisma.bulkJob.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.project.findMany({ where: { workspaceId: workspace.id, deletedAt: null }, select: { id: true, name: true } }),
    prisma.aIModel.findMany({ where: { active: true }, select: { provider: true, externalModelId: true, displayName: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  async function startBulk(formData: FormData) {
    "use server";
    const { user, workspace: ws } = await getActiveWorkspace();
    await requireWorkspace(ws.id, "EDITOR");
    const topics = String(formData.get("topics") || "").split("\n");
    const [provider, modelId] = String(formData.get("model") || "mock::mock-standard").split("::");
    await BulkService.createFromTopics({
      workspaceId: ws.id,
      createdById: user.id,
      projectId: String(formData.get("projectId") || "") || undefined,
      name: String(formData.get("name") || "Toplu iş"),
      provider: provider || "mock",
      modelId: modelId || "mock-standard",
      topics,
    });
    redirect("/bulk");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Toplu İçerik" description="Her satıra bir konu yazın; sistem hepsini kuyrukta üretir." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Toplu işler</CardTitle></CardHeader>
          <CardContent className="p-0">
            {jobs.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">Henüz toplu iş yok.</p>
            ) : (
              <ul className="divide-y">
                {jobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{j.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {j.completedItems}/{j.totalItems} tamamlandı · {j.failedItems} hata
                      </p>
                    </div>
                    <Badge variant={j.status === "COMPLETED" ? "success" : j.status === "FAILED" ? "destructive" : "warning"}>
                      {j.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Yeni toplu iş</CardTitle></CardHeader>
          <CardContent>
            <form action={startBulk} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">İş adı</Label>
                <Input id="name" name="name" defaultValue="Toplu içerik" />
              </div>
              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="projectId">Proje</Label>
                  <select id="projectId" name="projectId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— Yok —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <select id="model" name="model" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {models.map((m) => <option key={`${m.provider}-${m.externalModelId}`} value={`${m.provider}::${m.externalModelId}`}>{m.displayName}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topics">Konular (her satıra bir tane)</Label>
                <Textarea id="topics" name="topics" required className="min-h-[160px]" placeholder={"Cinsel saldırı suçu nedir?\nIsrarlı takip suçu nedir?"} />
              </div>
              <Button type="submit" className="w-full">Toplu üretimi başlat</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
