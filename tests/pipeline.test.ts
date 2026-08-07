import { describe, it, expect } from "vitest";
import { MockAIProvider } from "@/lib/ai/providers/mock";
import { runArticlePipeline } from "@/lib/generation/pipeline";
import { assembleArticleHtml } from "@/lib/articles/assemble";

describe("article generation pipeline (mock)", () => {
  it("produces a validated article + meta with no API key", async () => {
    const provider = new MockAIProvider();
    const result = await runArticlePipeline(provider, "mock-standard", {
      topic: "Cinsel suçlarda rıza nasıl ispatlanır?",
      language: "tr",
      targetCountry: "TR",
    });
    expect(result.brief).toBeDefined();
    expect(result.outline).toBeDefined();
    expect(result.article.sections.length).toBeGreaterThan(0);
    expect(result.meta.slug).toMatch(/^[a-z0-9-]+$/);
    expect(result.steps.map((s) => s.type)).toEqual(["BRIEF", "OUTLINE", "DRAFT", "META"]);

    const html = assembleArticleHtml(result.article);
    expect(html).toContain("<h2>");
    expect(html).not.toContain("<script");
  });

  it("skips brief/outline in fast mode", async () => {
    const provider = new MockAIProvider();
    const result = await runArticlePipeline(provider, "mock-standard", {
      topic: "Hızlı konu",
      language: "tr",
      targetCountry: "TR",
      fast: true,
    });
    expect(result.brief).toBeUndefined();
    expect(result.steps.map((s) => s.type)).toEqual(["DRAFT", "META"]);
  });
});
