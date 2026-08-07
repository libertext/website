import sanitizeHtml from "sanitize-html";

/**
 * Allowlist-based sanitizer for AI/user HTML before storage or WordPress publish (§75).
 * Strips <script>, event handlers, and any element/attr not explicitly permitted.
 */
const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "figure",
  "figcaption",
  "img",
  "hr",
  "br",
];

export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Force external links to be safe.
    transformTags: {
      a: (tagName, attribs) => {
        const rel = attribs.target === "_blank" ? "noopener noreferrer" : attribs.rel;
        return { tagName, attribs: { ...attribs, ...(rel ? { rel } : {}) } };
      },
    },
    disallowedTagsMode: "discard",
  });
}

/** Strip all tags to plain text (for readability/keyword analysis). */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
