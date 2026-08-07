import { z } from "zod";

/** Zod schemas for every structured AI output (§32). Reused for validation + repair. */

export const searchIntentSchema = z.enum([
  "INFORMATIONAL",
  "COMMERCIAL",
  "TRANSACTIONAL",
  "NAVIGATIONAL",
  "LOCAL",
  "MIXED",
]);

export const briefSchema = z.object({
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()).default([]),
  synonyms: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  searchIntent: searchIntentSchema,
  audience: z.string(),
  questionsToAnswer: z.array(z.string()).default([]),
  likelySubtopics: z.array(z.string()).default([]),
  recommendedAngle: z.string(),
  differentiation: z.string().optional().default(""),
  pitfalls: z.array(z.string()).default([]),
  claimsRequiringSources: z.array(z.string()).default([]),
  ctaSuggestion: z.string().optional().default(""),
});
export type Brief = z.infer<typeof briefSchema>;

export const titlesSchema = z.object({
  titles: z
    .array(
      z.object({
        title: z.string(),
        intentFit: z.number().min(0).max(100),
        clarity: z.number().min(0).max(100),
        keywordRelevance: z.number().min(0).max(100),
        clickAppeal: z.number().min(0).max(100),
        sensationalismRisk: z.number().min(0).max(100),
      }),
    )
    .min(1),
});
export type Titles = z.infer<typeof titlesSchema>;

type OutlineNode = { heading: string; level: number; children?: OutlineNode[] };
export const outlineNodeSchema: z.ZodType<OutlineNode> = z.lazy(() =>
  z.object({
    heading: z.string(),
    level: z.number().int().min(2).max(4),
    children: z.array(outlineNodeSchema).optional().default([]),
  }),
);
export const outlineSchema = z.object({
  h1: z.string(),
  sections: z.array(outlineNodeSchema).min(1),
  faq: z.array(z.string()).default([]),
});
export type Outline = z.infer<typeof outlineSchema>;

export const articleSchema = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()).default([]),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        level: z.number().int().min(2).max(4),
        html: z.string(),
      }),
    )
    .min(1),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  sources: z
    .array(z.object({ url: z.string(), title: z.string().optional() }))
    .default([]),
  suggestedInternalLinks: z
    .array(z.object({ targetUrl: z.string(), anchorText: z.string() }))
    .default([]),
});
export type ArticlePayload = z.infer<typeof articleSchema>;

export const metaSchema = z.object({
  metaTitle: z.string(),
  metaDescription: z.string(),
  slug: z.string(),
  excerpt: z.string(),
});
export type Meta = z.infer<typeof metaSchema>;

export const seoReviewSchema = z.object({
  score: z.number().min(0).max(100),
  checks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      passed: z.boolean(),
      weight: z.number(),
    }),
  ),
  semanticNotes: z.string().optional().default(""),
});
export type SeoReview = z.infer<typeof seoReviewSchema>;

export const qualityReviewSchema = z.object({
  status: z.enum(["PASS", "WARNING", "REVIEW_REQUIRED"]),
  answersUserQuestion: z.boolean(),
  hasOriginalSynthesis: z.boolean(),
  unnecessaryRepetition: z.boolean(),
  unsupportedClaims: z.array(z.string()).default([]),
  likelyHallucination: z.boolean(),
  misleadingTitle: z.boolean(),
  addsValue: z.boolean(),
  templatedFeel: z.boolean(),
  notes: z.string().optional().default(""),
});
export type QualityReview = z.infer<typeof qualityReviewSchema>;
