import { describe, it, expect, beforeAll } from "vitest";
import { assertSafeWordPressUrl } from "@/lib/wordpress/ssrf";

// Ensure the guard runs in "production" mode (private hosts blocked).
beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY =
    process.env.APP_ENCRYPTION_KEY ?? "0".repeat(64);
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://x";
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-value";
  process.env.ALLOW_PRIVATE_WORDPRESS_HOSTS = "false";
});

describe("SSRF guard", () => {
  it("blocks localhost", async () => {
    await expect(assertSafeWordPressUrl("http://localhost/wp")).rejects.toThrow();
  });
  it("blocks private IP literals", async () => {
    await expect(assertSafeWordPressUrl("https://10.0.0.5")).rejects.toThrow();
    await expect(assertSafeWordPressUrl("https://192.168.1.1")).rejects.toThrow();
    await expect(assertSafeWordPressUrl("https://172.16.0.1")).rejects.toThrow();
  });
  it("blocks the cloud metadata IP", async () => {
    await expect(assertSafeWordPressUrl("https://169.254.169.254")).rejects.toThrow();
  });
  it("rejects non-https in production mode", async () => {
    await expect(assertSafeWordPressUrl("http://93.184.216.34")).rejects.toThrow();
  });
});
