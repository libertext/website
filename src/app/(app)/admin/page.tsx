import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/primitives";

export const metadata = { title: "Admin" };

/** Platform admin surface — SUPER_ADMIN only (§66). */
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) redirect("/dashboard");

  const [users, workspaces, articles, models, failedJobs] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count({ where: { deletedAt: null } }),
    prisma.article.count({ where: { deletedAt: null } }),
    prisma.aIModel.count({ where: { active: true } }),
    prisma.generationJob.count({ where: { status: "FAILED" } }),
  ]);

  const stats = [
    { label: "Kullanıcı", value: users },
    { label: "Çalışma alanı", value: workspaces },
    { label: "Makale", value: articles },
    { label: "Aktif model", value: models },
    { label: "Başarısız iş", value: failedJobs },
  ];

  return (
    <div>
      <PageHeader title="Admin" description="Platform genel görünümü." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
