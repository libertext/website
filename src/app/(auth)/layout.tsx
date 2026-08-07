import Link from "next/link";
import { appConfig } from "@/lib/config/app";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            {appConfig.name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Yapay zeka destekli SEO içerik platformu
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
