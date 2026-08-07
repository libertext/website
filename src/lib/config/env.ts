import { z } from "zod";

/**
 * Server-side environment validation. Import ONLY from server code.
 * Fails fast at boot if required secrets are missing (§138, §252).
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 chars"),
  // 64 hex chars = 32 bytes for AES-256-GCM master key.
  APP_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "APP_ENCRYPTION_KEY must be 64 hex chars (32 bytes)"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Optional AI provider keys — platform-managed BYOK fallback. Absent = provider disabled.
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Research providers (optional).
  TAVILY_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),

  // Storage (optional; falls back to local disk).
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Email (optional; defaults to console transport).
  EMAIL_PROVIDER: z.enum(["console", "resend", "ses", "postmark"]).default("console"),
  EMAIL_FROM: z.string().default("ArticlePilot <no-reply@example.com>"),
  RESEND_API_KEY: z.string().optional(),

  // Bootstrap the first super-admin (§140).
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),

  // Observability (optional).
  SENTRY_DSN: z.string().optional(),

  // Toggle strict SSRF protection off ONLY in local dev (§9).
  ALLOW_PRIVATE_WORDPRESS_HOSTS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Which AI providers have a platform-managed key configured. */
export function platformProviderAvailability(): Record<string, boolean> {
  const env = getEnv();
  return {
    openai: Boolean(env.OPENAI_API_KEY),
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
    // Mock is always available for development/testing (§136).
    mock: true,
  };
}
