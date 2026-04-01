#!/usr/bin/env tsx
/**
 * Post-deploy cache warming script.
 * Run after deployment to pre-populate Redis with lookup data and pre-warm
 * public ISR pages so first visitors avoid regeneration cost.
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

const WARM_PATHS = ["/", "/pricing"];
const baseUrl = (process.env.WARM_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

async function warm(key: string, ttl: number, fetchFn: () => Promise<unknown>) {
  const data = await fetchFn();
  await redis.set(key, data, { ex: ttl });
  console.log(`✅ Warmed: ${key}`);
  return data;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warmPublicPath(path: string, rounds = 2) {
  if (!baseUrl) {
    console.warn(`⚠️ Skipping public path warm (${path}): set WARM_BASE_URL or NEXT_PUBLIC_APP_URL`);
    return;
  }

  const url = `${baseUrl}${path}`;

  for (let round = 1; round <= rounds; round += 1) {
    let ok = false;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            "user-agent": "publishroad-cache-warmer/1.0",
            "cache-control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }

        ok = true;
        console.log(`✅ Warmed public page: ${url} (round ${round}, attempt ${attempt})`);
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt === 3) {
          console.warn(`⚠️ Failed warming ${url} on round ${round}: ${message}`);
        } else {
          await wait(300 * attempt);
        }
      }
    }

    if (!ok) {
      break;
    }
  }
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

  await Promise.all(WARM_PATHS.map((path) => warmPublicPath(path)));

  console.log("\n✨ Cache warming complete!");
}

main()
  .catch((err) => {
    console.error("Cache warming failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
