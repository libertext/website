import { defineConfig, devices } from "@playwright/test";

/**
 * E2E happy-path config (§135). Requires a running app + seeded DB:
 *   docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev
 * then: pnpm test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
