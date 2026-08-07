/**
 * Central application config. The brand name lives here (and in env) so it can be
 * changed in ONE place — never hard-code "ArticlePilot" across the codebase (§2, §245).
 */
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "DYZGE Yapay Zeka",
  shortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME || "DYZGE",
  // Tagline reinforcing that YZ = Yapay Zeka (AI).
  tagline: "Yapay Zeka SEO İçerik Platformu",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supportEmail: process.env.SUPPORT_EMAIL || "destek@example.com",
  defaultLocale: "tr",
  defaultTimezone: "Europe/Istanbul",
} as const;

export type AppConfig = typeof appConfig;
