import { redis } from "./redis";

// ─────────────────────────────────────────────
// Cache key constants
// ─────────────────────────────────────────────
export const CacheKeys = {
  // Lookup data
  countries: "lookup:countries:active",
  categories: "lookup:categories:active",
  subcategories: (catId: string) => `lookup:subcategories:${catId}`,
  tags: "lookup:tags:active",

  // Pricing
  plans: "pricing:plans:active",
  plan: (planId: string) => `pricing:plan:${planId}`,

  // User data
  userProfile: (userId: string) => `user:${userId}:profile`,
  userNotificationsUnread: (userId: string) =>
    `user:${userId}:notifications:unread`,

  // Curation results (immutable)
  curationResults: (curationId: string) => `curation:${curationId}:results`,

  // Admin metrics
  adminMetrics: "admin:metrics:dashboard",

  // AI config
  aiConfig: "ai:config",
} as const;

// ─────────────────────────────────────────────
// TTL constants (seconds)
// ─────────────────────────────────────────────
export const CacheTTL = {
  LOOKUP: 86400,      // 24 hours
  PLAN: 300,          // 5 minutes
  USER_PROFILE: 300,  // 5 minutes
  NOTIFICATIONS: 30,  // 30 seconds
  ADMIN_METRICS: 300, // 5 minutes
  AI_CONFIG: 300,     // 5 minutes
} as const;

// ─────────────────────────────────────────────
// Stampede-protection: mutex lock pattern
// ─────────────────────────────────────────────
export async function getCachedWithLock<T>(
  key: string,
  ttlSeconds: number | null,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  // Acquire a Redis lock (SET NX EX 5)
  const lockKey = `${key}:lock`;
  const acquired = await redis.set(lockKey, "1", { nx: true, ex: 5 });

  if (!acquired) {
    // Another process is rebuilding; wait 150ms and retry once
    await new Promise((r) => setTimeout(r, 150));
    const retry = await redis.get<T>(key);
    if (retry !== null) return retry;
    // Fallback to direct fetch if still null
    return fetchFn();
  }

  try {
    const data = await fetchFn();
    if (ttlSeconds !== null) {
      await redis.set(key, data as unknown, { ex: ttlSeconds });
    } else {
      await redis.set(key, data as unknown); // No TTL for immutable data
    }
    return data;
  } finally {
    await redis.del(lockKey);
  }
}

// ─────────────────────────────────────────────
// Invalidation helpers
// ─────────────────────────────────────────────
export async function invalidateUserProfile(userId: string): Promise<void> {
  await redis.del(CacheKeys.userProfile(userId));
}

export async function invalidateLookup(
  type: "countries" | "categories" | "tags" | "plans"
): Promise<void> {
  const keyMap = {
    countries: CacheKeys.countries,
    categories: CacheKeys.categories,
    tags: CacheKeys.tags,
    plans: CacheKeys.plans,
  };
  await redis.del(keyMap[type]);
}

export async function invalidateAiConfig(): Promise<void> {
  await redis.del(CacheKeys.aiConfig);
}

export async function invalidateNotifications(userId: string): Promise<void> {
  await redis.del(CacheKeys.userNotificationsUnread(userId));
}
