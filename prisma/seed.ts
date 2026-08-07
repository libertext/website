import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

/**
 * Development seed (§139). Creates plans, the AI model registry, prompt templates,
 * a super-admin, and a sample workspace/project. Dev credentials only — never ship
 * these to production (§139).
 */
async function main() {
  console.log("Seeding…");

  // ── Plans + entitlements (§67) ──
  const plans = [
    { key: "FREE", name: "Ücretsiz", monthlyCredits: 30, priceMinor: 0, features: { maxProjects: "1", maxSites: "1", maxTeamMembers: "1", bulkGeneration: "false", maxBulkRows: "0", byok: "true", premiumModels: "false", contentCalendar: "false", priorityQueue: "false" } },
    { key: "STARTER", name: "Başlangıç", monthlyCredits: 300, priceMinor: 29900, features: { maxProjects: "5", maxSites: "3", maxTeamMembers: "3", bulkGeneration: "true", maxBulkRows: "50", byok: "true", premiumModels: "true", contentCalendar: "true", priorityQueue: "false" } },
    { key: "PRO", name: "Pro", monthlyCredits: 1200, priceMinor: 79900, features: { maxProjects: "25", maxSites: "10", maxTeamMembers: "10", bulkGeneration: "true", maxBulkRows: "200", byok: "true", premiumModels: "true", contentCalendar: "true", priorityQueue: "true" } },
    { key: "AGENCY", name: "Ajans", monthlyCredits: 5000, priceMinor: 199900, features: { maxProjects: "200", maxSites: "100", maxTeamMembers: "30", bulkGeneration: "true", maxBulkRows: "1000", byok: "true", premiumModels: "true", contentCalendar: "true", priorityQueue: "true" } },
  ];
  for (const [i, p] of plans.entries()) {
    const plan = await prisma.plan.upsert({
      where: { key: p.key },
      update: { name: p.name, monthlyCredits: p.monthlyCredits, priceMinor: p.priceMinor, sortOrder: i },
      create: { key: p.key, name: p.name, monthlyCredits: p.monthlyCredits, priceMinor: p.priceMinor, currency: "TRY", sortOrder: i },
    });
    for (const [key, value] of Object.entries(p.features)) {
      await prisma.planFeature.upsert({
        where: { planId_key: { planId: plan.id, key } },
        update: { value },
        create: { planId: plan.id, key, value },
      });
    }
  }

  // ── AI provider configs (§66) ──
  const providers = [
    { provider: "mock", displayName: "Mock (Test)", concurrency: 8 },
    { provider: "openai", displayName: "OpenAI", concurrency: 4 },
    { provider: "anthropic", displayName: "Claude", concurrency: 4 },
    { provider: "gemini", displayName: "Gemini", concurrency: 4 },
  ];
  for (const p of providers) {
    await prisma.aIProviderConfig.upsert({
      where: { provider: p.provider },
      update: { displayName: p.displayName, concurrency: p.concurrency },
      create: { provider: p.provider, displayName: p.displayName, concurrency: p.concurrency },
    });
  }

  // ── Model registry (§15, §141). Prices in USD micro-units per 1M tokens. ──
  const models = [
    { provider: "mock", externalModelId: "mock-standard", displayName: "Mock Standard", inputPricePerMTok: 0, outputPricePerMTok: 0, qualityTier: "BALANCED" as const, speedTier: "FAST" as const, defaultForArticle: true },
    { provider: "openai", externalModelId: "gpt-4o", displayName: "GPT-4o", inputPricePerMTok: 2_500_000, outputPricePerMTok: 10_000_000, qualityTier: "PREMIUM" as const, speedTier: "MEDIUM" as const },
    { provider: "openai", externalModelId: "gpt-4o-mini", displayName: "GPT-4o mini", inputPricePerMTok: 150_000, outputPricePerMTok: 600_000, qualityTier: "ECONOMY" as const, speedTier: "FAST" as const },
    { provider: "anthropic", externalModelId: "claude-3-5-sonnet-latest", displayName: "Claude 3.5 Sonnet", inputPricePerMTok: 3_000_000, outputPricePerMTok: 15_000_000, qualityTier: "PREMIUM" as const, speedTier: "MEDIUM" as const },
    { provider: "anthropic", externalModelId: "claude-3-5-haiku-latest", displayName: "Claude 3.5 Haiku", inputPricePerMTok: 800_000, outputPricePerMTok: 4_000_000, qualityTier: "BALANCED" as const, speedTier: "FAST" as const },
    { provider: "gemini", externalModelId: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro", inputPricePerMTok: 1_250_000, outputPricePerMTok: 5_000_000, qualityTier: "PREMIUM" as const, speedTier: "MEDIUM" as const },
    { provider: "gemini", externalModelId: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash", inputPricePerMTok: 75_000, outputPricePerMTok: 300_000, qualityTier: "ECONOMY" as const, speedTier: "FAST" as const },
  ];
  for (const [i, m] of models.entries()) {
    await prisma.aIModel.upsert({
      where: { provider_externalModelId: { provider: m.provider, externalModelId: m.externalModelId } },
      update: { displayName: m.displayName, inputPricePerMTok: m.inputPricePerMTok, outputPricePerMTok: m.outputPricePerMTok, qualityTier: m.qualityTier, speedTier: m.speedTier, sortOrder: i },
      create: {
        provider: m.provider,
        externalModelId: m.externalModelId,
        displayName: m.displayName,
        inputPricePerMTok: m.inputPricePerMTok,
        outputPricePerMTok: m.outputPricePerMTok,
        qualityTier: m.qualityTier,
        speedTier: m.speedTier,
        supportsStructured: true,
        supportsStreaming: true,
        defaultForArticle: m.defaultForArticle ?? false,
        sortOrder: i,
      },
    });
  }

  // ── Prompt templates (§57) ──
  const prompts = ["ARTICLE_BRIEF", "ARTICLE_OUTLINE", "ARTICLE_DRAFT", "ARTICLE_META", "SEO_REVIEW", "SECTION_REWRITE", "TITLE_GENERATOR"];
  for (const key of prompts) {
    await prisma.promptTemplate.upsert({
      where: { key },
      update: {},
      create: { key, description: `${key} prompt` },
    });
  }

  // ── Feature flags (§230) ──
  for (const key of ["DEEP_RESEARCH", "TOPIC_MAP", "CONTENT_REFRESH"]) {
    await prisma.featureFlag.upsert({ where: { key }, update: {}, create: { key, enabled: false } });
  }

  // ── Dev admin + sample workspace (§139, §140) ──
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "admin@articlepilot.dev").toLowerCase();
  const passwordHash = await hash("admin1234", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { isSuperAdmin: true },
    create: { email: adminEmail, passwordHash, name: "Admin", isSuperAdmin: true, emailVerified: new Date() },
  });

  const freePlan = await prisma.plan.findUnique({ where: { key: "PRO" } });
  let ws = await prisma.workspace.findFirst({ where: { slug: "demo" } });
  if (!ws) {
    ws = await prisma.workspace.create({
      data: {
        name: "Demo Çalışma Alanı",
        slug: "demo",
        planId: freePlan?.id,
        members: { create: { userId: admin.id, role: "OWNER" } },
        creditAccount: { create: { balance: 1000 } },
      },
    });
    await prisma.creditTransaction.create({
      data: { workspaceId: ws.id, type: "MONTHLY_GRANT", amount: 1000, balanceAfter: 1000, description: "Seed kredisi" },
    });
    const project = await prisma.project.create({
      data: {
        workspaceId: ws.id,
        name: "Örnek Blog",
        language: "tr",
        targetCountry: "TR",
        niche: "Genel",
        preferredProvider: "mock",
        preferredModelId: "mock-standard",
      },
    });
    await prisma.writingProfile.create({
      data: {
        projectId: project.id,
        brandName: "Örnek Marka",
        tone: "profesyonel ama anlaşılır",
        audience: "genel okuyucu",
        addressing: "siz",
      },
    });
  }

  console.log(`Seed complete. Admin: ${adminEmail} / admin1234 (dev only)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
