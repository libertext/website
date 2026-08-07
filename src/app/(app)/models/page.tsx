import { getActiveWorkspace } from "@/lib/auth/current";
import { prisma } from "@/lib/db/prisma";
import { availableProviders } from "@/lib/ai/registry";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, Badge } from "@/components/ui/primitives";

export const metadata = { title: "AI Modelleri" };

const PROVIDER_LABEL: Record<string, string> = { mock: "Mock", openai: "OpenAI", anthropic: "Claude", gemini: "Gemini" };

export default async function ModelsPage() {
  const { workspace } = await getActiveWorkspace();
  const [models, avail] = await Promise.all([
    prisma.aIModel.findMany({ where: { active: true }, orderBy: [{ provider: "asc" }, { sortOrder: "asc" }] }),
    availableProviders(workspace.id),
  ]);

  return (
    <div>
      <PageHeader title="AI Modelleri" description="Kullanılabilir modeller ve fiyatları (1M token başına USD)." />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Sağlayıcı</th>
                <th className="p-3 font-medium">Model</th>
                <th className="p-3 font-medium">Kalite</th>
                <th className="p-3 font-medium">Girdi $</th>
                <th className="p-3 font-medium">Çıktı $</th>
                <th className="p-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const usable = avail[m.provider as keyof typeof avail];
                return (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="p-3">{PROVIDER_LABEL[m.provider] ?? m.provider}</td>
                    <td className="p-3 font-medium">{m.displayName}</td>
                    <td className="p-3">{m.qualityTier}</td>
                    <td className="p-3 text-muted-foreground">{(m.inputPricePerMTok / 1_000_000).toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground">{(m.outputPricePerMTok / 1_000_000).toFixed(2)}</td>
                    <td className="p-3">
                      {usable ? <Badge variant="success">Kullanılabilir</Badge> : <Badge variant="muted">Anahtar yok</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
