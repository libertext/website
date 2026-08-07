import { Check, X } from "lucide-react";
import type { SeoAnalysisResult } from "@/lib/seo/analyze";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";

/** Transparent SEO panel: shows the score AND every check behind it (§37, §220). */
export function SeoPanel({ seo }: { seo: SeoAnalysisResult }) {
  const color =
    seo.score >= 80 ? "text-success" : seo.score >= 60 ? "text-amber-500" : "text-destructive";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>SEO / Kalite</CardTitle>
        <span className={cn("text-2xl font-bold", color)}>{seo.score}</span>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Puan; aşağıdaki ağırlıklı kontrollerin toplamıdır. Sıralama garantisi değildir.
        </p>
        <ul className="space-y-1.5">
          {seo.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              {c.passed ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className={cn(!c.passed && "text-foreground")}>
                {c.label}
                {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
