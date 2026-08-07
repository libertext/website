import { htmlToText } from "@/lib/seo/sanitize";

/**
 * Deterministic SEO/quality checks (§37, §221). No LLM cost — pure heuristics.
 * Transparent: every check contributes a named, weighted signal so the UI can
 * show WHY the score is what it is (§220). Not a ranking promise (§37, §38).
 */
export interface SeoCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  detail?: string;
}

export interface SeoAnalysisInput {
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  focusKeyword?: string | null;
  contentHtml: string;
}

export interface SeoAnalysisResult {
  score: number; // 0–100, transparent weighted sum
  checks: SeoCheck[];
}

function includesKeyword(text: string, keyword?: string | null): boolean {
  if (!keyword) return false;
  return text.toLocaleLowerCase("tr").includes(keyword.toLocaleLowerCase("tr"));
}

export function analyzeSeo(input: SeoAnalysisInput): SeoAnalysisResult {
  const text = htmlToText(input.contentHtml);
  const words = text.split(/\s+/).filter(Boolean);
  const h2Count = (input.contentHtml.match(/<h2\b/gi) ?? []).length;
  const headings = [...input.contentHtml.matchAll(/<h([2-4])\b[^>]*>(.*?)<\/h\1>/gis)].map((m) =>
    (m[2] ?? "").replace(/<[^>]+>/g, "").trim().toLocaleLowerCase("tr"),
  );
  const duplicateHeadings = headings.length !== new Set(headings).size;
  const internalOrExternalLinks = (input.contentHtml.match(/<a\b/gi) ?? []).length;
  const imgs = [...input.contentHtml.matchAll(/<img\b[^>]*>/gi)];
  const imgsMissingAlt = imgs.filter((m) => !/\balt\s*=\s*["'][^"']+["']/i.test(m[0])).length;
  const longParas = [...input.contentHtml.matchAll(/<p\b[^>]*>(.*?)<\/p>/gis)].filter(
    (m) => (m[1] ?? "").replace(/<[^>]+>/g, "").split(/\s+/).length > 160,
  ).length;

  const metaTitleLen = (input.metaTitle ?? "").length;
  const metaDescLen = (input.metaDescription ?? "").length;

  const checks: SeoCheck[] = [
    {
      id: "keyword_in_title",
      label: "Anahtar kelime başlıkta",
      passed: includesKeyword(input.title, input.focusKeyword),
      weight: 12,
    },
    {
      id: "meta_title_present",
      label: "Meta başlık var",
      passed: metaTitleLen > 0,
      weight: 6,
    },
    {
      id: "meta_title_length",
      label: "Meta başlık uzunluğu (≤60)",
      passed: metaTitleLen > 0 && metaTitleLen <= 60,
      weight: 6,
      detail: `${metaTitleLen} karakter`,
    },
    {
      id: "meta_description_present",
      label: "Meta açıklama var",
      passed: metaDescLen > 0,
      weight: 6,
    },
    {
      id: "meta_description_length",
      label: "Meta açıklama uzunluğu (50–160)",
      passed: metaDescLen >= 50 && metaDescLen <= 160,
      weight: 6,
      detail: `${metaDescLen} karakter`,
    },
    {
      id: "slug_readable",
      label: "Okunaklı slug",
      passed: Boolean(input.slug && /^[a-z0-9-]+$/.test(input.slug) && input.slug.length <= 80),
      weight: 4,
    },
    {
      id: "has_h2",
      label: "En az bir H2 başlık",
      passed: h2Count >= 1,
      weight: 10,
      detail: `${h2Count} H2`,
    },
    {
      id: "no_duplicate_headings",
      label: "Tekrarlayan başlık yok",
      passed: !duplicateHeadings,
      weight: 6,
    },
    {
      id: "has_links",
      label: "İç/dış link var",
      passed: internalOrExternalLinks >= 1,
      weight: 8,
    },
    {
      id: "images_have_alt",
      label: "Görsellerin alt metni var",
      passed: imgsMissingAlt === 0,
      weight: 6,
      detail: imgsMissingAlt > 0 ? `${imgsMissingAlt} görsel alt metinsiz` : undefined,
    },
    {
      id: "no_overlong_paragraphs",
      label: "Aşırı uzun paragraf yok",
      passed: longParas === 0,
      weight: 6,
      detail: longParas > 0 ? `${longParas} uzun paragraf` : undefined,
    },
    {
      id: "sufficient_depth",
      label: "Konu yeterince açıklanmış",
      passed: words.length >= 300,
      weight: 8,
      detail: `${words.length} kelime`,
    },
    {
      id: "keyword_not_stuffed",
      label: "Keyword stuffing yok",
      passed: keywordDensity(text, input.focusKeyword) <= 0.035,
      weight: 6,
      detail: `%${(keywordDensity(text, input.focusKeyword) * 100).toFixed(1)} yoğunluk`,
    },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const score = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);
  return { score, checks };
}

function keywordDensity(text: string, keyword?: string | null): number {
  if (!keyword) return 0;
  const words = text.toLocaleLowerCase("tr").split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const kw = keyword.toLocaleLowerCase("tr");
  const occurrences = words.filter((w) => w.includes(kw.split(/\s+/)[0] ?? kw)).length;
  return occurrences / words.length;
}
