import type { WritingProfile } from "@prisma/client";

/** Render a project's WritingProfile into a compact system-prompt block (§21). */
export function renderWritingProfile(p: Partial<WritingProfile> | null | undefined): string | undefined {
  if (!p) return undefined;
  const lines: string[] = [];
  if (p.brandName) lines.push(`Marka: ${p.brandName}`);
  if (p.aboutSite) lines.push(`Site hakkında: ${p.aboutSite}`);
  if (p.authorName) lines.push(`Yazar: ${p.authorName}${p.authorTitle ? ` (${p.authorTitle})` : ""}`);
  if (p.audience) lines.push(`Hedef kitle: ${p.audience}`);
  if (p.tone) lines.push(`Üslup: ${p.tone}`);
  if (p.formality) lines.push(`Formalite: ${p.formality}`);
  if (p.addressing) lines.push(`Hitap: ${p.addressing}`);
  if (p.cta) lines.push(`CTA: ${p.cta}`);
  if (p.preferredTerms?.length) lines.push(`Tercih edilen terimler: ${p.preferredTerms.join(", ")}`);
  if (p.bannedWords?.length) lines.push(`Kullanılmayacak kelimeler: ${p.bannedWords.join(", ")}`);
  if (p.avoidPhrases?.length) lines.push(`Kaçınılacak ifadeler: ${p.avoidPhrases.join(", ")}`);
  if (p.disclaimer) lines.push(`Zorunlu açıklama (disclaimer): ${p.disclaimer}`);
  if (p.sourcePolicy) lines.push(`Kaynak politikası: ${p.sourcePolicy}`);
  if (p.linkPolicy) lines.push(`Link politikası: ${p.linkPolicy}`);
  return lines.length ? lines.join("\n") : undefined;
}
