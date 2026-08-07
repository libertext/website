import { getActiveWorkspace } from "@/lib/auth/current";
import { prisma } from "@/lib/db/prisma";
import { CreditService } from "@/lib/services/credit-service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";

export const metadata = { title: "Kullanım" };

export default async function UsagePage() {
  const { workspace } = await getActiveWorkspace();
  const [balance, usage, txns] = await Promise.all([
    CreditService.getBalance(workspace.id),
    prisma.aIUsage.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { startedAt: "desc" },
      take: 30,
    }),
    prisma.creditTransaction.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Kullanım" description="AI token kullanımı ve kredi hareketleri." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-2xl font-bold">{balance}</p><p className="text-xs text-muted-foreground">Kredi bakiyesi</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold">{usage.reduce((s, u) => s + u.inputTokens + u.outputTokens, 0).toLocaleString("tr")}</p><p className="text-xs text-muted-foreground">Toplam token (son 30)</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold">${(usage.reduce((s, u) => s + u.estimatedProviderCostMicro, 0) / 1_000_000).toFixed(2)}</p><p className="text-xs text-muted-foreground">Tahmini AI maliyeti</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Kredi hareketleri</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr><th className="p-3 font-medium">Tür</th><th className="p-3 font-medium">Miktar</th><th className="p-3 font-medium">Bakiye</th><th className="p-3 font-medium">Tarih</th></tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3">{t.type}</td>
                  <td className={`p-3 ${t.amount < 0 ? "text-destructive" : "text-success"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</td>
                  <td className="p-3 text-muted-foreground">{t.balanceAfter}</td>
                  <td className="p-3 text-muted-foreground">{t.createdAt.toLocaleDateString("tr")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
