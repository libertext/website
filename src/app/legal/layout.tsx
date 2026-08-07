import Link from "next/link";
import { appConfig } from "@/lib/config/app";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-primary hover:underline">← {appConfig.name}</Link>
      <div className="prose-article mt-6">{children}</div>
      <p className="mt-10 rounded-md bg-muted p-4 text-xs text-muted-foreground">
        Bu metin bir taslaktır ve hukuki tavsiye niteliği taşımaz. Yayına almadan önce hukuk
        danışmanınıza inceletin.
      </p>
    </div>
  );
}
