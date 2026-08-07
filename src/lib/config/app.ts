/**
 * Central application config. The brand name lives here (and in env) so it can be
 * changed in ONE place — never hard-code "ArticlePilot" across the codebase (§2, §245).
 */
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "ArticlePilot AI",
  shortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME || "ArticlePilot",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supportEmail: process.env.SUPPORT_EMAIL || "destek@example.com",
  defaultLocale: "tr",
  defaultTimezone: "Europe/Istanbul",
} as const;

export type AppConfig = typeof appConfig;
