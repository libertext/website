import { getRedis } from "@/lib/queue/connection";

/**
 * Fixed-window rate limiter backed by Redis (§70). Fails OPEN if Redis is down,
 * so an infra hiccup can't lock everyone out — abuse protection, not access control.
 * Returns true if the action is allowed.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const redis = getRedis();
    const bucket = `rl:${key}`;
    const count = await redis.incr(bucket);
    if (count === 1) await redis.expire(bucket, windowSeconds);
    return count <= limit;
  } catch {
    return true;
  }
}
