/**
 * Turkish-aware slug generation (§101).
 * "Çocuğun Cinsel İstismarı Suçu" → "cocugun-cinsel-istismari-sucu"
 */
const TR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "c",
  Ğ: "g",
  Ö: "o",
  Ş: "s",
  Ü: "u",
};

export function slugify(input: string): string {
  const lowered = input
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    // Turkish "I" lowercases to dotless ı → map to i; do case fold after replacement.
    .toLowerCase();
  return lowered
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip remaining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 96);
}

/** Ensure uniqueness against a set of taken slugs by appending -2, -3, ... */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const slug = slugify(base);
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}
