import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { NextRequest } from "next/server";

const isRedisConfigured =
  process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

// ─────────────────────────────────────────────
// Rate limiter instances (sliding window)
// ─────────────────────────────────────────────
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:login",
});

export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:signup",
});

export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "rl:password_reset",
});

export const curationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:curation",
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "rl:api_auth",
});

export const unauthLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:api_unauth",
});

export const adminApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  prefix: "rl:admin_api",
});

export const fileUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:file_upload",
});

export const bulkImportLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "5 m"),
  prefix: "rl:bulk_import",
});

// ─────────────────────────────────────────────
// Helper: get client IP from request
// ─────────────────────────────────────────────
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─────────────────────────────────────────────
// Helper: check rate limit and return headers
// ─────────────────────────────────────────────
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  retryAfter?: number;
  headers: Record<string, string>;
}> {
  // Skip rate limiting when Redis is not configured (local dev)
  if (!isRedisConfigured) {
    return { success: true, headers: {} };
  }

  const { success, limit, remaining, reset } =
    await limiter.limit(identifier);

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return {
    success,
    retryAfter: success ? undefined : retryAfter,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(reset),
      ...(success ? {} : { "Retry-After": String(retryAfter) }),
    },
  };
}
