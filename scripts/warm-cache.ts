#!/usr/bin/env tsx
/**
 * Post-deploy cache warming script.
 * Run after deployment to pre-populate Redis with lookup data.
 *
 * Usage: npx tsx scripts/warm-cache.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
import { Redis } from "@upstash/redis";

const db = new PrismaClient();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function warm(key: string, ttl: number, fetchFn: () => Promise<unknown>) {
  const data = await fetchFn();
  await redis.set(key, data, { ex: ttl });
  console.log(`✅ Warmed: ${key}`);
  return data;
}

async function main() {
  console.log("🔥 Warming cache...\n");

  await Promise.all([
    warm("lookup:countries:active", 3600, () =>
      db.country.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, flagEmoji: true },
      })
    ),
    warm("lookup:categories:active", 3600, () =>
      db.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      })
    ),
    warm("lookup:tags:active", 3600, () =>
      db.tag.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      })
    ),
    warm("lookup:plans:active", 3600, () =>
      db.planConfig.findMany({
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
      })
    ),
  ]);

  console.log("\n✨ Cache warming complete!");
}

main()
  .catch((err) => {
    console.error("Cache warming failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
