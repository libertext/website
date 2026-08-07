"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createArticleAction } from "@/lib/articles/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Input, Label, Textarea } from "@/components/ui/primitives";

interface Model {
  provider: string;
  externalModelId: string;
  displayName: string;
  qualityTier: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  mock: "Mock (Test)",
  openai: "OpenAI",
  anthropic: "Claude",
  gemini: "Gemini",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Makale oluşturuluyor..." : "Makaleyi Oluştur"}
    </Button>
  );
}

export function NewArticleForm({
  projects,
  models,
}: {
  projects: { id: string; name: string }[];
  models: Model[];
}) {
  const providers = useMemo(() => [...new Set(models.map((m) => m.provider))], [models]);
  const [provider, setProvider] = useState(providers[0] ?? "mock");
  const providerModels = models.filter((m) => m.provider === provider);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={createArticleAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic">Konu *</Label>
            <Textarea
              id="topic"
              name="topic"
              required
              placeholder="Örn. Cinsel suçlarda rıza nasıl ispatlanır?"
              className="min-h-[70px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primaryKeyword">Ana anahtar kelime (opsiyonel)</Label>
            <Input id="primaryKeyword" name="primaryKeyword" placeholder="cinsel suçlar" />
          </div>

          {projects.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="projectId">Proje</Label>
              <select
                id="projectId"
                name="projectId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Proje seçilmedi —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="provider">Sağlayıcı</Label>
              <select
                id="provider"
                name="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABEL[p] ?? p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelId">Model</Label>
              <select
                id="modelId"
                name="modelId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {providerModels.map((m) => (
                  <option key={m.externalModelId} value={m.externalModelId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="fast" value="true" className="h-4 w-4" />
            Hızlı mod (brief ve outline adımlarını atla)
          </label>

          <SubmitButton />
          <p className="text-center text-xs text-muted-foreground">
            Bu işlem kredi kullanır. Gerçek maliyet üretim sonrası hesaplanır.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
