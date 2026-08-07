import { redirect } from "next/navigation";
import { requireUser, getDefaultWorkspaceId } from "@/lib/auth/context";
import { createWorkspace } from "@/lib/services/workspace-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@/components/ui/primitives";

export default async function OnboardingPage() {
  const user = await requireUser();
  const existing = await getDefaultWorkspaceId(user.id);
  if (existing) redirect("/dashboard");

  async function create(formData: FormData) {
    "use server";
    const u = await requireUser();
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    await createWorkspace({
      userId: u.id,
      name,
      primaryUse: String(formData.get("primaryUse") || ""),
      contentLang: String(formData.get("contentLang") || "tr"),
      targetCountry: String(formData.get("targetCountry") || "TR"),
    });
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Çalışma alanını oluştur</CardTitle>
          <CardDescription>
            Çalışma alanı; sitelerini, projelerini ve ekibini bir arada tutar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Çalışma alanı adı</Label>
              <Input id="name" name="name" required placeholder="Örn. Hukuk Bürosu Blog" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primaryUse">Ana kullanım amacın</Label>
              <select
                id="primaryUse"
                name="primaryUse"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="blog">Blog / içerik pazarlaması</option>
                <option value="agency">Ajans / müşteri siteleri</option>
                <option value="ecommerce">E-ticaret</option>
                <option value="local">Yerel işletme</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contentLang">İçerik dili</Label>
                <select
                  id="contentLang"
                  name="contentLang"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">İngilizce</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="targetCountry">Hedef ülke</Label>
                <select
                  id="targetCountry"
                  name="targetCountry"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="TR">Türkiye</option>
                  <option value="DE">Almanya</option>
                  <option value="US">ABD</option>
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Devam et
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
