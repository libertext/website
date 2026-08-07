import { describe, it, expect } from "vitest";
import { analyzeSeo } from "@/lib/seo/analyze";
import { sanitizeArticleHtml } from "@/lib/seo/sanitize";

describe("analyzeSeo", () => {
  it("scores a good article highly and exposes checks", () => {
    const html =
      "<h2>Yapay zeka nedir</h2><p>" + "kelime ".repeat(200) + "</p><h2>Detay</h2><p>metin</p><a href='/x'>link</a>";
    const res = analyzeSeo({
      title: "Yapay zeka rehberi",
      metaTitle: "Yapay zeka rehberi",
      metaDescription: "Yapay zeka hakkinda kapsamli bir rehber ve pratik ipuclari burada.",
      slug: "yapay-zeka-rehberi",
      focusKeyword: "yapay zeka",
      contentHtml: html,
    });
    expect(res.score).toBeGreaterThan(60);
    expect(res.checks.find((c) => c.id === "keyword_in_title")?.passed).toBe(true);
    expect(res.checks.find((c) => c.id === "has_h2")?.passed).toBe(true);
  });

  it("flags missing meta and headings", () => {
    const res = analyzeSeo({ title: "x", contentHtml: "<p>kısa</p>" });
    expect(res.checks.find((c) => c.id === "has_h2")?.passed).toBe(false);
    expect(res.checks.find((c) => c.id === "meta_description_present")?.passed).toBe(false);
    expect(res.score).toBeLessThan(50);
  });
});

describe("sanitizeArticleHtml", () => {
  it("strips scripts and event handlers", () => {
    const dirty = "<p onclick=\"alert(1)\">hi</p><script>alert(2)</script><h2>ok</h2>";
    const clean = sanitizeArticleHtml(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("<h2>ok</h2>");
  });
  it("drops disallowed tags", () => {
    expect(sanitizeArticleHtml("<iframe src='x'></iframe><p>ok</p>")).toBe("<p>ok</p>");
  });
});
