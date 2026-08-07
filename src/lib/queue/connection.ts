import { Redis } from "ioredis";
import { getEnv } from "@/lib/config/env";

let connection: Redis | null = null;

/** Shared BullMQ Redis connection. maxRetriesPerRequest must be null for BullMQ. */
export function getRedis(): Redis {
  if (connection) return connection;
  connection = new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
  return connection;
}
