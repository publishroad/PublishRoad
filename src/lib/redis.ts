import { Redis } from "@upstash/redis";

const isRedisConfigured =
  process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

// Minimal no-op Redis stub for local dev without Upstash
const noopRedis = {
  get: async () => null,
  set: async () => "OK" as const,
  del: async (..._keys: string[]) => 0,
  ping: async () => "PONG" as const,
} as unknown as Redis;

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis: Redis =
  globalForRedis.redis ??
  (isRedisConfigured
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : noopRedis);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// ─────────────────────────────────────────────
// Typed wrappers
// ─────────────────────────────────────────────
export async function redisGet<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  if (ttlSeconds) {
    await redis.set(key, value, { ex: ttlSeconds });
  } else {
    await redis.set(key, value);
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
