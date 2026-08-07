import { getActiveWorkspace } from "@/lib/auth/current";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, Badge } from "@/components/ui/primitives";
import { connectAppPasswordSite } from "@/lib/wordpress/actions";
import { Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "WordPress Siteleri" };

const HEALTH: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  CONNECTED: "success",
  DEGRADED: "warning",
  ERROR: "destructive",
  DISCONNECTED: "muted",
};

export default async function SitesPage() {
  const { workspace } = await getActiveWorkspace();
  const sites = await prisma.wordPressSite.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="WordPress Siteleri"
        description="Bağlantı için ArticlePilot Connector eklentisi önerilir; alternatif olarak uygulama şifresi kullanabilirsiniz."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-0">
            {sites.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">
                WordPress siteni bağlayarak makalelerini doğrudan yayınlayabilirsin.
              </p>
            ) : (
              <ul className="divide-y">
                {sites.map((s) => (
                  <li key={s.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.url} · {s.mode}</p>
                    </div>
                    <Badge variant={HEALTH[s.health] ?? "muted"}>{s.health}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-sm font-medium">Uygulama şifresi ile bağla</p>
            <form action={connectAppPasswordSite} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Site adı</Label>
                <Input id="name" name="name" required placeholder="Blogum" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="url">Site URL</Label>
                <Input id="url" name="url" required placeholder="https://ornek.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Kullanıcı adı</Label>
                <Input id="username" name="username" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appPassword">Uygulama şifresi</Label>
                <Input id="appPassword" name="appPassword" type="password" required />
              </div>
              <Button type="submit" className="w-full">Bağlan</Button>
              <p className="text-xs text-muted-foreground">
                Kimlik bilgileri şifrelenerek saklanır. Normal hesap şifrenizi kullanmayın.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
