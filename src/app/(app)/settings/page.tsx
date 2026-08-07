import { getActiveWorkspace } from "@/lib/auth/current";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { saveProviderKeyAction, removeProviderKeyAction } from "@/lib/settings/provider-actions";

export const metadata = { title: "Ayarlar" };

const PROVIDERS: { id: "openai" | "anthropic" | "gemini"; label: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Claude (Anthropic)" },
  { id: "gemini", label: "Gemini (Google)" },
];

export default async function SettingsPage() {
  const { workspace } = await getActiveWorkspace();
  const creds = await prisma.userProviderCredential.findMany({ where: { workspaceId: workspace.id } });
  const byProvider = new Map(creds.map((c) => [c.provider, c]));

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Ayarlar" description="AI sağlayıcı anahtarları ve çalışma alanı ayarları." />

      <Card>
        <CardHeader>
          <CardTitle>AI API Anahtarları (BYOK)</CardTitle>
          <CardDescription>
            API anahtarınız şifrelenerek saklanır ve tarayıcıya geri gönderilmez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {PROVIDERS.map((p) => {
            const cred = byProvider.get(p.id);
            return (
              <div key={p.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium">{p.label}</span>
                  {cred ? (
                    <Badge variant="success">sk-••••{cred.keyLast4}</Badge>
                  ) : (
                    <Badge variant="muted">Bağlı değil</Badge>
                  )}
                </div>
                {cred ? (
                  <form action={removeProviderKeyAction}>
                    <input type="hidden" name="provider" value={p.id} />
                    <Button type="submit" variant="outline" size="sm">Kaldır</Button>
                  </form>
                ) : (
                  <form action={saveProviderKeyAction} className="flex gap-2">
                    <input type="hidden" name="provider" value={p.id} />
                    <Input name="apiKey" type="password" placeholder="API anahtarı" className="flex-1" />
                    <Button type="submit" size="sm">Kaydet</Button>
                  </form>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
