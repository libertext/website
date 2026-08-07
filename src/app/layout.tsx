import type { Metadata } from "next";
import { appConfig } from "@/lib/config/app";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${appConfig.name} — Yapay Zeka SEO İçerik Platformu`,
    template: `%s · ${appConfig.shortName}`,
  },
  description:
    "SEO içeriklerinizi yapay zeka ile üretin, düzenleyin ve WordPress'e tek tıkla yayınlayın.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
