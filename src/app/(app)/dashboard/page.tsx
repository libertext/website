import Link from "next/link";
import { FileText, Send, CalendarClock, Coins, Globe, PlusCircle } from "lucide-react";
import { getActiveWorkspace } from "@/lib/auth/current";
import { prisma } from "@/lib/db/prisma";
import { CreditService } from "@/lib/services/credit-service";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { statusBadge } from "@/components/app/status-badge";

export default async function DashboardPage() {
  const { workspace } = await getActiveWorkspace();
  const wsId = workspace.id;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [created, published, scheduled, credits, sites, recent, usageAgg] = await Promise.all([
    prisma.article.count({ where: { workspaceId: wsId, deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.article.count({ where: { workspaceId: wsId, status: "WP_PUBLISHED" } }),
    prisma.article.count({ where: { workspaceId: wsId, status: "WP_SCHEDULED" } }),
    CreditService.getBalance(wsId),
    prisma.wordPressSite.count({ where: { workspaceId: wsId, deletedAt: null } }),
    prisma.article.findMany({
      where: { workspaceId: wsId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.aIUsage.aggregate({
      where: { workspaceId: wsId, startedAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true, estimatedProviderCostMicro: true },
    }),
  ]);

  const tokens = (usageAgg._sum.inputTokens ?? 0) + (usageAgg._sum.outputTokens ?? 0);
  const costUsd = ((usageAgg._sum.estimatedProviderCostMicro ?? 0) / 1_000_000).toFixed(2);

  const stats = [
    { label: "Bu ay oluşturulan", value: created, icon: FileText },
    { label: "Yayınlanan", value: published, icon: Send },
    { label: "Planlanan", value: scheduled, icon: CalendarClock },
    { label: "Kredi bakiyesi", value: credits, icon: Coins },
    { label: "Kullanılan token", value: tokens.toLocaleString("tr"), icon: FileText },
    { label: "Bağlı site", value: sites, icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel</h1>
          <p className="text-sm text-muted-foreground">Tahmini AI maliyeti (bu ay): ${costUsd}</p>
        </div>
        <Link href="/articles/new" className={buttonVariants()}>
          <PlusCircle className="h-4 w-4" /> Yeni Makale
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-accent p-2.5 text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son makaleler</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Henüz makalen yok.</p>
              <Link href="/articles/new" className={`${buttonVariants()} mt-3`}>
                İlk Makaleni Oluştur
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/articles/${a.id}`} className="truncate hover:underline">
                    {a.title || "(başlıksız)"}
                  </Link>
                  <Badge variant={statusBadge(a.status).variant}>{statusBadge(a.status).label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
