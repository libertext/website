import { lookup } from "node:dns/promises";
import net from "node:net";
import { getEnv } from "@/lib/config/env";
import { AppError } from "@/lib/ai/errors";

/**
 * SSRF protection for user-supplied WordPress URLs (§9).
 * We resolve the hostname to IPs and reject private/loopback/link-local/metadata
 * ranges — closing the DNS-rebinding gap by validating the resolved IP, not the name.
 * Dev can opt out via ALLOW_PRIVATE_WORDPRESS_HOSTS.
 */

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
  if (lower.startsWith("fe80")) return true; // link-local
  // IPv4-mapped (::ffff:a.b.c.d)
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isBlockedIPv4(mapped[1]);
  return false;
}

function ipBlocked(ip: string): boolean {
  return net.isIPv6(ip) ? isBlockedIPv6(ip) : isBlockedIPv4(ip);
}

/** Validate a URL is safe to fetch server-side. Returns the parsed URL. */
export async function assertSafeWordPressUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError("WORDPRESS_CONNECTION_FAILED", { message: "Invalid URL" });
  }

  const allowPrivate = getEnv().ALLOW_PRIVATE_WORDPRESS_HOSTS;

  if (url.protocol !== "https:" && !(allowPrivate && url.protocol === "http:")) {
    throw new AppError("SSRF_BLOCKED", { message: "HTTPS required" });
  }
  if (allowPrivate) return url;

  const host = url.hostname;
  if (host === "localhost") throw new AppError("SSRF_BLOCKED", { message: "localhost blocked" });

  // If the host is already an IP literal, check it directly.
  if (net.isIP(host)) {
    if (ipBlocked(host)) throw new AppError("SSRF_BLOCKED");
    return url;
  }

  // Resolve and check every returned address (DNS rebinding defense).
  const results = await lookup(host, { all: true }).catch(() => {
    throw new AppError("WORDPRESS_CONNECTION_FAILED", { message: "DNS resolution failed" });
  });
  if (results.length === 0) throw new AppError("WORDPRESS_CONNECTION_FAILED");
  for (const r of results) {
    if (ipBlocked(r.address)) throw new AppError("SSRF_BLOCKED", { message: `Blocked IP ${r.address}` });
  }
  return url;
}
