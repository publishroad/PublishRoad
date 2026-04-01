import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-resilience";
import { verifyPassword } from "@/lib/server-utils";

export type LoginCheckCode = "OK" | "INVALID_CREDENTIALS";

type LoginEvaluatorOptions = {
  recordFailures?: boolean;
  loadProfile?: boolean;
  useCache?: boolean;
};

export type LoginEvaluationResult =
  | {
      code: "OK";
      user: {
        id: string;
        email: string;
        name: string | null;
        planSlug: string;
        creditsRemaining: number;
        isEmailVerified: boolean;
      };
    }
  | { code: "INVALID_CREDENTIALS" };

const AUTH_CACHE_TTL_MS = 8_000;
const INVALID_AUTH_MIN_DELAY_MS = 120;

type AuthUserSnapshot = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  authProvider: string;
  lockedUntil: Date | null;
  failedLoginCount: number;
  emailVerifiedAt: Date | null;
  planId: string | null;
  creditsRemaining: number;
};

const authUserCache = new Map<string, { value: AuthUserSnapshot | null; expiresAt: number }>();

function getCachedAuthUser(email: string): AuthUserSnapshot | null | undefined {
  const hit = authUserCache.get(email);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    authUserCache.delete(email);
    return undefined;
  }
  return hit.value;
}

function setCachedAuthUser(email: string, value: AuthUserSnapshot | null) {
  authUserCache.set(email, {
    value,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });
}

function invalidateAuthUserCache(email: string) {
  authUserCache.delete(email);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTimingEqualizer(startTimeMs: number) {
  const elapsed = Date.now() - startTimeMs;
  const jitter = Math.floor(Math.random() * 25);
  const remaining = INVALID_AUTH_MIN_DELAY_MS + jitter - elapsed;
  if (remaining > 0) {
    await sleep(remaining);
  }
}

async function loadAuthUser(email: string, useCache: boolean): Promise<AuthUserSnapshot | null> {
  if (useCache) {
    const cached = getCachedAuthUser(email);
    if (cached !== undefined) return cached;
  }

  const user = await withDbRetry(() =>
    db.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        authProvider: true,
        lockedUntil: true,
        failedLoginCount: true,
        emailVerifiedAt: true,
        planId: true,
        creditsRemaining: true,
      },
    })
  );

  if (useCache) {
    setCachedAuthUser(email, user);
  }

  return user;
}

async function resolvePlanSlug(planId: string | null): Promise<string> {
  if (!planId) return "free";
  const plan = await withDbRetry(() =>
    db.planConfig.findUnique({
      where: { id: planId },
      select: { slug: true },
    })
  );
  return plan?.slug ?? "free";
}

export async function evaluateLoginCredentials(
  email: string,
  password: string,
  options: LoginEvaluatorOptions = {}
): Promise<LoginEvaluationResult> {
  const startedAt = Date.now();
  const useCache = options.useCache ?? !options.recordFailures;
  const loadProfile = options.loadProfile ?? !!options.recordFailures;
  const user = await loadAuthUser(email, useCache);

  if (!user) {
    await runTimingEqualizer(startedAt);
    return { code: "INVALID_CREDENTIALS" };
  }

  if (user.authProvider === "google" || !user.passwordHash) {
    await runTimingEqualizer(startedAt);
    return { code: "INVALID_CREDENTIALS" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await runTimingEqualizer(startedAt);
    return { code: "INVALID_CREDENTIALS" };
  }

  const isValid = await verifyPassword(user.passwordHash, password);

  if (!isValid) {
    if (options.recordFailures) {
      const newCount = user.failedLoginCount + 1;
      const lockedUntil = newCount >= 15 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await withDbRetry(() =>
        db.user.update({
          where: { id: user.id },
          data: { failedLoginCount: newCount, ...(lockedUntil ? { lockedUntil } : {}) },
        })
      );
      invalidateAuthUserCache(email);
    }
    return { code: "INVALID_CREDENTIALS" };
  }

  if (options.recordFailures && (user.failedLoginCount > 0 || user.lockedUntil)) {
    await withDbRetry(() =>
      db.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      })
    );
    invalidateAuthUserCache(email);
  }

  const planSlug = loadProfile ? await resolvePlanSlug(user.planId) : "free";

  return {
    code: "OK",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      planSlug,
      creditsRemaining: user.creditsRemaining,
      isEmailVerified: !!user.emailVerifiedAt,
    },
  };
}
