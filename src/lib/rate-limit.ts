import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { NextRequest } from "next/server";

type RateLimitCheckResult = {
  success: boolean;
  retryAfter?: number;
  headers: Record<string, string>;
};

const isRedisConfigured =
  process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes("placeholder");

// ─────────────────────────────────────────────
// Rate limiter instances (sliding window)
// ─────────────────────────────────────────────
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, "1 s"),
  prefix: "rl:login",
});

export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 s"),
  prefix: "rl:signup",
});

export const contactLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, "1 s"),
  prefix: "rl:contact",
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

const trustedProxyIps = (process.env.TRUSTED_PROXY_IPS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let num = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    num = (num << 8) + value;
  }

  return num >>> 0;
}

function ipMatchesRule(ip: string, rule: string): boolean {
  if (rule === ip) {
    return true;
  }

  if (!rule.includes("/")) {
    return false;
  }

  const [baseIp, prefixLengthRaw] = rule.split("/");
  const prefixLength = Number(prefixLengthRaw);

  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(baseIp);
  if (ipInt === null || baseInt === null) {
    return false;
  }

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

const sessionFingerprintCookies = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "admin_session",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

// ─────────────────────────────────────────────
// Helper: get client IP from request
// ─────────────────────────────────────────────
export function getClientIp(request: NextRequest): string {
  if (trustedProxyIps.length === 0) {
    return "unknown";
  }

  const forwardedChain =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("cf-connecting-ip") ??
    "";

  const chainParts = forwardedChain
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (chainParts.length === 0) {
    return "unknown";
  }

  const proxyIp = chainParts.length > 1 ? chainParts[chainParts.length - 1] : null;
  if (!proxyIp) {
    return "unknown";
  }

  const isTrustedProxy = trustedProxyIps.some((rule) => ipMatchesRule(proxyIp, rule));
  if (!isTrustedProxy) {
    return "unknown";
  }

  const clientIp = chainParts[0];
  if (clientIp) {
    return clientIp;
  }

  return "unknown";
}

function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function getSessionTokenFragment(request: NextRequest): string | null {
  for (const name of sessionFingerprintCookies) {
    const value = request.cookies.get(name)?.value;
    if (value) {
      return `${name}:${value}`;
    }
  }

  return null;
}

function getDeviceFingerprint(request: NextRequest): string {
  const sessionToken = getSessionTokenFragment(request);
  const source = sessionToken
    ? `sess:${sessionToken}`
    : [
        request.headers.get("user-agent") ?? "ua:unknown",
        request.headers.get("accept-language") ?? "lang:unknown",
        request.headers.get("sec-ch-ua") ?? "ch-ua:unknown",
        request.headers.get("sec-ch-ua-platform") ?? "platform:unknown",
      ].join("|");

  return `fp:${simpleHash(source)}`;
}

export function buildRateLimitIdentifiers(
  request: NextRequest,
  options: {
    scope: string;
    userId?: string | null;
    includeIp?: boolean;
  }
): string[] {
  const identifiers = new Set<string>();

  identifiers.add(`${options.scope}:${getDeviceFingerprint(request)}`);

  if (options.userId) {
    identifiers.add(`${options.scope}:uid:${options.userId}`);
  }

  if (options.includeIp !== false) {
    identifiers.add(`${options.scope}:ip:${getClientIp(request)}`);
  }

  return Array.from(identifiers);
}

// ─────────────────────────────────────────────
// Helper: check rate limit and return headers
// ─────────────────────────────────────────────
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitCheckResult> {
  // Skip rate limiting when Redis is not configured (local dev)
  if (!isRedisConfigured) {
    return { success: true, headers: {} };
  }

  const { success, limit, remaining, reset } =
    await limiter.limit(identifier);

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

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

export async function checkRateLimitForIdentifiers(
  limiter: Ratelimit,
  identifiers: string[]
): Promise<RateLimitCheckResult> {
  for (const identifier of identifiers) {
    const result = await checkRateLimit(limiter, identifier);
    if (!result.success) {
      return result;
    }
  }

  return { success: true, headers: {} };
}

type BackpressureBucket = {
  active: number;
};

const backpressureState = globalThis as typeof globalThis & {
  __apiBackpressure?: Map<string, BackpressureBucket>;
};

const buckets = backpressureState.__apiBackpressure ?? new Map<string, BackpressureBucket>();
if (!backpressureState.__apiBackpressure) {
  backpressureState.__apiBackpressure = buckets;
}

export function tryAcquireBackpressure(key: string, maxInflight: number): (() => void) | null {
  const bucket = buckets.get(key) ?? { active: 0 };
  if (bucket.active >= maxInflight) {
    return null;
  }

  bucket.active += 1;
  buckets.set(key, bucket);

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const current = buckets.get(key);
    if (!current) {
      return;
    }

    current.active = Math.max(0, current.active - 1);
    if (current.active === 0) {
      buckets.delete(key);
      return;
    }

    buckets.set(key, current);
  };
}
