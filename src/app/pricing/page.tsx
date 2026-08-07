import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";

export const metadata = { title: "Fiyatlandırma" };
// Plans come from the DB at request time — don't statically prerender.
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    include: { features: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold">Planlar</h1>
        <p className="mt-2 text-muted-foreground">İhtiyacına göre başla, büyüdükçe yükselt.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <p className="text-2xl font-bold">
                {p.priceMinor === 0 ? "Ücretsiz" : `${(p.priceMinor / 100).toLocaleString("tr")} ${p.currency}`}
                {p.priceMinor > 0 && <span className="text-sm font-normal text-muted-foreground">/ay</span>}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{p.monthlyCredits} kredi / ay</p>
              <ul className="space-y-1 text-sm">
                {p.features
                  .filter((f) => f.value === "true" || Number(f.value) > 0)
                  .slice(0, 6)
                  .map((f) => (
                    <li key={f.id} className="text-muted-foreground">• {f.key}</li>
                  ))}
              </ul>
              <Link href="/register" className={`${buttonVariants()} w-full`}>Başla</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
