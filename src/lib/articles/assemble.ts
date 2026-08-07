import type { ArticlePayload } from "@/lib/ai/schemas";
import { sanitizeArticleHtml } from "@/lib/seo/sanitize";

/**
 * Turn a structured article payload into clean, WordPress-ready HTML (§33).
 * Pure and deterministic — unit-testable without a provider or DB.
 */
export function assembleArticleHtml(payload: ArticlePayload): string {
  const parts: string[] = [];
  for (const section of payload.sections) {
    const level = Math.min(4, Math.max(2, section.level));
    parts.push(`<h${level}>${escapeText(section.heading)}</h${level}>`);
    parts.push(section.html);
  }
  if (payload.faq.length > 0) {
    parts.push("<h2>Sıkça Sorulan Sorular</h2>");
    for (const item of payload.faq) {
      parts.push(`<h3>${escapeText(item.question)}</h3>`);
      parts.push(`<p>${escapeText(item.answer)}</p>`);
    }
  }
  return sanitizeArticleHtml(parts.join("\n"));
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
