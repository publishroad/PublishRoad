#!/usr/bin/env tsx
/**
 * Dry-run verification of star-tier ordering for a given category.
 * Fetches candidates from DB and shows the exact order the curation engine
 * would produce for sections A/B/C/D/E/F — WITHOUT calling AI or writing
 * any DB records.
 *
 * Run: npx tsx scripts/verify-curation-tiers.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require("@prisma/adapter-pg");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ── target category ──────────────────────────────────────────────────────────
const TARGET_CATEGORY_SLUG = "saas"; // change to test another category
const MAX_PER_SECTION = 20;

// ── mirrors curation-engine.ts logic ─────────────────────────────────────────
function getStarTier(starRating: number | null | undefined): 0 | 3 | 4 | 5 {
  if (starRating === 5) return 5;
  if (starRating === 4) return 4;
  if (starRating === 3) return 3;
  return 0;
}

function tierSort<T extends { id: string; name: string; starRating: number | null; da?: number | null; followersCount?: number | null; totalMembers?: number | null }>(
  pool: T[],
  label: string
) {
  const scored = pool.map((entity) => ({
    entity,
    starTier: getStarTier(entity.starRating),
  }));

  const sorted = [5, 4, 3, 0].flatMap((tier) =>
    scored
      .filter((item) => item.starTier === tier)
      .sort((a, b) => {
        // within tier: sort by da/followersCount/totalMembers desc
        const scoreA = a.entity.da ?? a.entity.followersCount ?? a.entity.totalMembers ?? 0;
        const scoreB = b.entity.da ?? b.entity.followersCount ?? b.entity.totalMembers ?? 0;
        return scoreB - scoreA;
      })
  ).slice(0, MAX_PER_SECTION);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}  (total candidates: ${pool.length}, showing top ${sorted.length})`);
  console.log(`${"─".repeat(60)}`);

  if (sorted.length === 0) {
    console.log("  ⚠️  No candidates found for this section.");
    return;
  }

  sorted.forEach((item, idx) => {
    const starLabel = item.starTier > 0 ? `★${item.starTier}` : "  ";
    const secondary = item.entity.da != null ? `DA:${item.entity.da}` :
                      item.entity.followersCount != null ? `followers:${item.entity.followersCount}` :
                      item.entity.totalMembers != null ? `members:${item.entity.totalMembers}` : "";
    console.log(
      `  ${String(idx + 1).padStart(2)}. [${starLabel}]  ${item.entity.name.slice(0, 50).padEnd(50)}  ${secondary}`
    );
  });
}

async function main() {
  // Resolve category
  const category = await db.category.findFirst({
    where: { slug: TARGET_CATEGORY_SLUG, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (!category) {
    console.error(`Category "${TARGET_CATEGORY_SLUG}" not found or inactive.`);
    const all = await db.category.findMany({ where: { isActive: true }, select: { slug: true, name: true } });
    console.log("Available:", all.map((c: { slug: string; name: string }) => `${c.slug} (${c.name})`).join(", "));
    process.exit(1);
  }

  console.log(`\n🔍  Tier verification for category: "${category.name}" (${category.slug})`);
  console.log(`    Max per section: ${MAX_PER_SECTION}`);

  // ── Section A: Distribution ──────────────────────────────────────────────
  const distribution = await db.website.findMany({
    where: { isActive: true, isExcluded: false, type: "distribution", websiteCategories: { some: { categoryId: category.id } } },
    orderBy: [{ starRating: "desc" }, { da: "desc" }],
    select: { id: true, name: true, url: true, starRating: true, da: true },
  });
  tierSort(distribution, "Section A — Distribution");

  // ── Section B: Guest Post ────────────────────────────────────────────────
  const guestPost = await db.website.findMany({
    where: { isActive: true, isExcluded: false, type: "guest_post", websiteCategories: { some: { categoryId: category.id } } },
    orderBy: [{ starRating: "desc" }, { da: "desc" }],
    select: { id: true, name: true, url: true, starRating: true, da: true },
  });
  tierSort(guestPost, "Section B — Guest Post");

  // ── Section C: Press Release ─────────────────────────────────────────────
  const pressRelease = await db.website.findMany({
    where: { isActive: true, isExcluded: false, type: "press_release", websiteCategories: { some: { categoryId: category.id } } },
    orderBy: [{ starRating: "desc" }, { da: "desc" }],
    select: { id: true, name: true, url: true, starRating: true, da: true },
  });
  tierSort(pressRelease, "Section C — Press Release");

  // ── Section D: Influencers ───────────────────────────────────────────────
  // Check both categorySlugs array AND join table
  const influencersBySlug = await db.influencer.findMany({
    where: { isActive: true, categorySlugs: { hasSome: [category.slug] } },
    select: { id: true, name: true, starRating: true, followersCount: true },
  });
  const influencersByJoin = await db.influencer.findMany({
    where: { isActive: true, influencerCategories: { some: { categoryId: category.id } } },
    select: { id: true, name: true, starRating: true, followersCount: true },
  });
  const slugIds = new Set(influencersBySlug.map((i: { id: string }) => i.id));
  const joinOnly = influencersByJoin.filter((i: { id: string }) => !slugIds.has(i.id));
  console.log(`\nInfluencers via categorySlugs: ${influencersBySlug.length}`);
  console.log(`Influencers via join table:    ${influencersByJoin.length}`);
  if (joinOnly.length > 0) {
    console.log(`⚠️  In join table but MISSING from categorySlugs (${joinOnly.length}):`);
    for (const i of joinOnly) console.log(`    - ${i.name}`);
  } else {
    console.log(`✅  No mismatch — categorySlugs and join table are in sync`);
  }
  tierSort(
    influencersByJoin.map((i: { id: string; name: string; starRating: number | null; followersCount: number | null }) => ({ ...i, da: null, totalMembers: null })),
    "Section D — Influencers (join table)"
  );

  // ── Section E: Reddit ────────────────────────────────────────────────────
  const redditBySlug = await db.redditChannel.findMany({
    where: { isActive: true, categorySlugs: { hasSome: [category.slug] } },
    select: { id: true, name: true, starRating: true, totalMembers: true },
  });
  const redditByJoin = await db.redditChannel.findMany({
    where: { isActive: true, redditChannelCategories: { some: { categoryId: category.id } } },
    select: { id: true, name: true, starRating: true, totalMembers: true },
  });
  const redditSlugIds = new Set(redditBySlug.map((r: { id: string }) => r.id));
  const redditJoinOnly = redditByJoin.filter((r: { id: string }) => !redditSlugIds.has(r.id));
  console.log(`\nReddit via categorySlugs: ${redditBySlug.length}`);
  console.log(`Reddit via join table:    ${redditByJoin.length}`);
  if (redditJoinOnly.length > 0) {
    console.log(`⚠️  In join table but MISSING from categorySlugs (${redditJoinOnly.length}):`);
    for (const r of redditJoinOnly) console.log(`    - ${r.name}`);
  } else {
    console.log(`✅  No mismatch — categorySlugs and join table are in sync`);
  }
  tierSort(
    redditByJoin.map((r: { id: string; name: string; starRating: number | null; totalMembers: number | null }) => ({ ...r, da: null, followersCount: null })),
    "Section E — Reddit (join table)"
  );

  // ── Section F: Funds ─────────────────────────────────────────────────────
  const fundsBySlug = await db.fund.findMany({
    where: { isActive: true, categorySlugs: { hasSome: [category.slug] } },
    select: { id: true, name: true, starRating: true },
  });
  const fundsByJoin = await db.fund.findMany({
    where: { isActive: true, fundCategories: { some: { categoryId: category.id } } },
    select: { id: true, name: true, starRating: true },
  });
  const fundSlugIds = new Set(fundsBySlug.map((f: { id: string }) => f.id));
  const fundJoinOnly = fundsByJoin.filter((f: { id: string }) => !fundSlugIds.has(f.id));
  console.log(`\nFunds via categorySlugs: ${fundsBySlug.length}`);
  console.log(`Funds via join table:    ${fundsByJoin.length}`);
  if (fundJoinOnly.length > 0) {
    console.log(`⚠️  In join table but MISSING from categorySlugs (${fundJoinOnly.length}):`);
    for (const f of fundJoinOnly) console.log(`    - ${f.name}`);
  } else {
    console.log(`✅  No mismatch — categorySlugs and join table are in sync`);
  }
  tierSort(
    fundsByJoin.map((f: { id: string; name: string; starRating: number | null }) => ({ ...f, da: null, followersCount: null, totalMembers: null })),
    "Section F — Funds (join table)"
  );

  console.log(`\n${"═".repeat(60)}`);
  console.log("  ✅  Verification complete.");
  console.log("  • Rank 1 in each section should be the highest-starred entry.");
  console.log("  • 5★ entries always precede 4★, 4★ precede 3★, 3★ precede unstarred.");
  console.log(`${"═".repeat(60)}\n`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
