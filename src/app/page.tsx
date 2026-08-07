import Link from "next/link";
import { Sparkles, Zap, Globe, ShieldCheck } from "lucide-react";
import { appConfig } from "@/lib/config/app";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  const features = [
    { icon: Sparkles, title: "Çoklu AI", body: "OpenAI, Claude ve Gemini modelleri arasında seç." },
    { icon: Zap, title: "Toplu üretim", body: "Yüzlerce makaleyi kuyrukla güvenle üret." },
    { icon: Globe, title: "WordPress", body: "Taslak, yayınla veya ileri tarihe planla." },
    { icon: ShieldCheck, title: "Güvenli", body: "Şifreli kimlik bilgileri, kiracı izolasyonu." },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-6 md:px-10">
        <span className="text-lg font-bold text-primary">{appConfig.name}</span>
        <nav className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
            Fiyatlandırma
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Giriş
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Ücretsiz başla
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
          SEO içeriklerinizi yapay zeka ile üretin, WordPress'e tek tıkla yayınlayın.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Araştır, planla, yaz, incele, optimize et ve yayınla — hepsi tek platformda.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Hemen başla
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Planları gör
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 text-left">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/legal/privacy" className="hover:underline">Gizlilik Politikası</Link>
          <Link href="/legal/terms" className="hover:underline">Kullanım Koşulları</Link>
          <Link href="/legal/cookies" className="hover:underline">Çerez Politikası</Link>
          <Link href="/legal/ai-usage" className="hover:underline">Yapay Zeka Kullanımı</Link>
        </div>
        <p className="mt-3">© {appConfig.name}</p>
      </footer>
    </div>
  );
}
