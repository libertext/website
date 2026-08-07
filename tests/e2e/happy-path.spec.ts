import { test, expect } from "@playwright/test";

/**
 * FLOW A happy path (§135, §240): register → onboarding → create article (mock) →
 * editor shows content + SEO metadata. Uses the MockAIProvider so no API key/cost.
 * Requires a running server + migrated/seeded DB (see playwright.config.ts).
 */
test("register, onboard, generate an article with the mock provider", async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Ad").fill("E2E");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill("password123");
  await page.getByRole("button", { name: /Hesabı oluştur/ }).click();

  // Onboarding: create workspace.
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Çalışma alanı adı").fill("E2E Alan");
  await page.getByRole("button", { name: /Devam et/ }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  // Create an article with the mock provider.
  await page.goto("/articles/new");
  await page.getByLabel("Konu *").fill("Yapay zeka ile SEO içerik üretimi");
  await page.getByRole("button", { name: /Makaleyi Oluştur/ }).click();

  // Editor eventually shows the generated content + SEO panel.
  await expect(page.getByText("SEO / Kalite")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Önizleme")).toBeVisible();
});
