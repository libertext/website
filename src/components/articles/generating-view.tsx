"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/primitives";

/** Polls the server while the article is generating (§62, simple + reliable MVP). */
export function GeneratingView({ title }: { title: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="mx-auto max-w-lg pt-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <p className="font-medium">Makale oluşturuluyor…</p>
            <p className="mt-1 text-sm text-muted-foreground">{title}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Bu işlem birkaç saniye sürebilir. Sayfa otomatik yenilenir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
