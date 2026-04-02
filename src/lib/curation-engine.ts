import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { redis } from "@/lib/redis";
import { rankWebsitesForCuration, expandCurationIntent } from "@/lib/ai";
import { sendCurationCompleteEmail } from "@/lib/email";
import { invalidateUserProfile } from "@/lib/cache";

interface RunCurationInput {
  userId: string;
  productUrl: string;
  countryId?: string | null;
  categoryId?: string | null;
  keywords: string[];
  description: string | null;
}

type ProgressEvent =
  | "started"
  | "fetching_sites"
  | "calling_ai"
  | "saving_results"
  | "complete"
  | "error";

async function setProgress(curationId: string, event: ProgressEvent) {
  const key = `curation:${curationId}:progress`;
  // Keep for 10 minutes — enough for the SSE client to pick it up
  await redis.set(key, event, { ex: 600 });
}

async function assertCurationStillExists(curationId: string) {
  const curation = await db.curation.findUnique({
    where: { id: curationId },
    select: { id: true },
  });

  if (!curation) {
    throw new Error("CURATION_CANCELLED");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract meaningful words from free-form text for description overlap scoring.
// Strips stop words and short tokens so "a CRM for small businesses" becomes
// ["crm", "small", "businesses"] — words worth matching on.
// ─────────────────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","can",
  "it","its","this","that","these","those","i","we","you","they","he","she",
  "my","our","your","their","we're","it's","i'm","don't","not","no","so",
  "as","into","out","up","about","which","who","what","how","when","where",
]);

function extractDescWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalize a string for consistent matching across all scoring rules:
// lowercase → trim → strip non-alphanumeric (except spaces and hyphens) → trim.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeStr(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").trim();
}

// ─── Scoring Rule 1: Category match ──────────────────────────────────────────
// +3 per entity category slug that equals the user's selected category slug.
// Deduplication via Set prevents the same slug scoring more than once.
function scoreCategoryMatch(entityCategorySlugs: string[], userCategorySlug: string): number {
  if (!userCategorySlug) return 0;
  const normUser = normalizeStr(userCategorySlug);
  const seen = new Set<string>();
  let score = 0;
  for (const slug of entityCategorySlugs) {
    const norm = normalizeStr(slug);
    if (!seen.has(norm) && norm === normUser) {
      score += 3;
      seen.add(norm);
    }
  }
  return score;
}

// ─── Scoring Rule 2: Keyword-to-tag match ────────────────────────────────────
// +2 per unique user keyword that exactly matches an entity tag slug.
// Uses a Set for O(1) tag lookup; deduplicates keywords before counting.
function scoreKeywordTagMatch(entityTagSlugs: string[], userKeywords: string[]): number {
  const tagSet = new Set(entityTagSlugs.map(normalizeStr));
  const seen = new Set<string>();
  let score = 0;
  for (const kw of userKeywords) {
    const norm = normalizeStr(kw);
    if (!seen.has(norm) && tagSet.has(norm)) {
      score += 2;
      seen.add(norm);
    }
  }
  return score;
}

// ─── Scoring Rule 3: Country match ───────────────────────────────────────────
// +2 if the entity's countryId equals the user's selected countryId.
// Returns 0 when either value is absent.
function scoreCountryMatch(
  entityCountryId: string | null | undefined,
  userCountryId: string | null | undefined
): number {
  if (!entityCountryId || !userCountryId) return 0;
  return entityCountryId === userCountryId ? 2 : 0;
}

// ─── Scoring Rule 4: Description word match ──────────────────────────────────
// +1 per unique meaningful word in the product description that matches an entity
// tag slug or category slug. Stop-word filtering is applied upstream by
// extractDescWords(), so all words passed here are already meaningful.
function scoreDescriptionMatch(
  entityTagSlugs: string[],
  entityCategorySlugs: string[],
  descWords: string[]
): number {
  const entityTokens = new Set([
    ...entityTagSlugs.map(normalizeStr),
    ...entityCategorySlugs.map(normalizeStr),
  ]);
  const seen = new Set<string>();
  let score = 0;
  for (const w of descWords) {
    const norm = normalizeStr(w);
    if (!seen.has(norm) && entityTokens.has(norm)) {
      score += 1;
      seen.add(norm);
    }
  }
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregates all four scoring rules into a final integer score with a breakdown
// object for traceability. All rules are independent — order doesn't matter.
// ─────────────────────────────────────────────────────────────────────────────
interface ScoreBreakdown {
  category: number;
  keyword: number;
  country: number;
  description: number;
}

function computeEntityScore(
  entity: {
    tagSlugs: string[];
    categorySlugs: string[];
    countryId?: string | null;
  },
  userCategorySlug: string,
  userKeywords: string[],
  userCountryId: string | null | undefined,
  descWords: string[]
): { finalScore: number; breakdown: ScoreBreakdown } {
  const category = scoreCategoryMatch(entity.categorySlugs, userCategorySlug);
  const keyword = scoreKeywordTagMatch(entity.tagSlugs, userKeywords);
  const country = scoreCountryMatch(entity.countryId, userCountryId);
  const description = scoreDescriptionMatch(entity.tagSlugs, entity.categorySlugs, descWords);
  return {
    finalScore: category + keyword + country + description,
    breakdown: { category, keyword, country, description },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorts entities with country-priority grouping:
//   - When userCountryId is set: country-matched entities come first (sorted by
//     _score desc), then non-matching entities fill the remainder (also by _score).
//     Slicing to MAX_PER_SECTION naturally implements "fill-up to 20" behaviour.
//   - When userCountryId is null (worldwide): pure descending score sort.
// ─────────────────────────────────────────────────────────────────────────────
function sortWithCountryPriority<T extends { _score: number; _cntryMatch: boolean }>(
  entities: T[],
  userCountryId: string | null | undefined
): T[] {
  if (!userCountryId) {
    return [...entities].sort((a, b) => b._score - a._score);
  }
  const matched = entities.filter((e) => e._cntryMatch).sort((a, b) => b._score - a._score);
  const rest = entities.filter((e) => !e._cntryMatch).sort((a, b) => b._score - a._score);
  return [...matched, ...rest];
}

export async function runCuration(input: RunCurationInput) {
  const { userId, productUrl, countryId, categoryId, keywords, description } = input;

  const LIFETIME_MONTHLY_CREDITS = 15;

  // ─── Step 1: Credit check + deduction in a single transaction ─────────────
  // We use a raw transaction with SELECT FOR UPDATE to prevent race conditions
  // when two requests arrive simultaneously with credits=1.
  const result = await db.$transaction(async (tx) => {
    const user = await tx.$queryRaw<Array<{
      credits_remaining: number;
      credits_reset_at: Date | null;
      plan_id: string | null;
    }>>(
      Prisma.sql`SELECT credits_remaining, credits_reset_at, plan_id FROM "users" WHERE id::text = ${userId} FOR UPDATE`
    );

    const row = user[0];
    let credits = row?.credits_remaining ?? 0;

    // ── Lifetime monthly reset ──────────────────────────────────────────────
    // Lifetime users get 15 curations/month. Auto-reset if 30+ days have passed.
    const isLifetime = row?.plan_id != null && (
      await tx.$queryRaw<Array<{ slug: string }>>(
        Prisma.sql`SELECT slug FROM "plan_configs" WHERE id = ${row.plan_id} LIMIT 1`
      )
    )[0]?.slug === "lifetime";

    if (isLifetime) {
      const lastReset = row?.credits_reset_at;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const needsReset = !lastReset || lastReset < thirtyDaysAgo;

      if (needsReset && credits === 0) {
        // Reset credits for a new month
        await tx.$executeRaw(
          Prisma.sql`UPDATE "users" SET credits_remaining = ${LIFETIME_MONTHLY_CREDITS}, credits_reset_at = ${now} WHERE id::text = ${userId}`
        );
        credits = LIFETIME_MONTHLY_CREDITS;
      } else if (needsReset && credits > 0) {
        // First-time or reset without running out — just stamp the reset date
        await tx.$executeRaw(
          Prisma.sql`UPDATE "users" SET credits_reset_at = ${now} WHERE id::text = ${userId}`
        );
      }
    }

    if (credits === 0) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    // Deduct 1 credit
    await tx.$executeRaw(
      Prisma.sql`UPDATE "users" SET credits_remaining = credits_remaining - 1 WHERE id::text = ${userId}`
    );

    // Validate country ID exists (if provided)
    let validCountryId: string | null = null;
    if (countryId) {
      const country = await tx.country.findUnique({
        where: { id: countryId },
        select: { id: true },
      });
      if (!country) {
        console.warn(`Country ID "${countryId}" not found, setting to null`);
        validCountryId = null;
      } else {
        validCountryId = countryId;
      }
    }

    // Create curation record
    const curation = await tx.curation.create({
      data: {
        userId,
        productUrl,
        countryId: validCountryId,
        keywords,
        description,
        status: "pending",
      },
    });

    return curation;
  });

  // Refresh cached profile immediately so the deducted credit is visible while
  // the curation is still processing.
  await invalidateUserProfile(userId).catch(() => {});

  // ─── Step 2: Process asynchronously (fire and forget) ────────────────────
  // In production this would be a background job/queue (e.g., Upstash QStash).
  // For simplicity here we use a detached async function.
  processCuration(result.id, userId, productUrl, keywords, description, countryId, categoryId).catch(
    async (err) => {
      if (err instanceof Error && err.message === "CURATION_CANCELLED") {
        return;
      }

      console.error(`Curation ${result.id} failed:`, err);

      const markedFailed = await db.curation.updateMany({
        where: {
          id: result.id,
          status: { in: ["pending", "processing"] },
        },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message.slice(0, 1000) : "Unknown curation error",
        },
      }).catch(() => ({ count: 0 }));

      if (markedFailed.count === 0) {
        return;
      }

      await setProgress(result.id, "error").catch(() => {});

      // Refund the credit only for genuine processing failures.
      await db.user.update({
        where: { id: userId },
        data: { creditsRemaining: { increment: 1 } },
      }).catch(() => {});
      await invalidateUserProfile(userId).catch(() => {});
    }
  );

  return result;
}

async function processCuration(
  curationId: string,
  userId: string,
  productUrl: string,
  keywords: string[],
  description: string | null,
  countryId?: string | null,
  categoryId?: string | null
) {
  await assertCurationStillExists(curationId);
  await setProgress(curationId, "started");

  await db.curation.update({
    where: { id: curationId },
    data: { status: "processing" },
  });

  // ─── Step 3: Fetch candidate pools ────────────────────────────────────────
  await assertCurationStillExists(curationId);
  await setProgress(curationId, "fetching_sites");

  // Fetch country name + all active categories in parallel (categories needed for keyword expansion)
  const [country, availableCategories] = await Promise.all([
    countryId
      ? db.country.findUnique({ where: { id: countryId }, select: { name: true } })
      : Promise.resolve(null),
    db.category.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } }),
  ]);

  // ── 3a: AI keyword expansion + category inference ────────────────────────
  // Expands the user's keywords using their business description and infers
  // the best matching category if the user didn't select one.
  const { expandedKeywords, inferredCategoryId } = await expandCurationIntent({
    productUrl,
    description: description ?? "",
    keywords,
    availableCategories,
  });

  // Use inferred category if user didn't explicitly pick one
  const effectiveCategoryId = categoryId ?? inferredCategoryId;
  const category = effectiveCategoryId
    ? (availableCategories.find((c) => c.id === effectiveCategoryId) ?? null)
    : null;

  const categorySlugs = category ? [category.slug] : [];
  // Use expanded keywords (includes originals + AI-derived synonyms) for all DB queries
  const keywordsLower = expandedKeywords.length > 0
    ? expandedKeywords
    : keywords.map((k) => k.toLowerCase());

  // Resolved slug for the effective category — used as the target in scoreCategoryMatch
  const userCategorySlug = category?.slug ?? "";

  // Map from category ID → slug; resolves website.categoryId (FK) to a slug for scoring
  const categorySlugMap = new Map(availableCategories.map((c) => [c.id, c.slug]));

  // Extract meaningful words from product description for description-overlap scoring
  const productDescWords = extractDescWords(description ?? "");

  // Build website base conditions as an AND array to avoid key conflicts
  const websiteBaseConditions: Prisma.WebsiteWhereInput[] = [
    { isActive: true },
    { isExcluded: false },
    ...(countryId ? [{ OR: [{ websiteCountries: { some: { countryId } } }, { websiteCountries: { none: {} } }] } as Prisma.WebsiteWhereInput] : []),
    ...(categoryId ? [{ OR: [{ categoryId }, { categoryId: null }] } as Prisma.WebsiteWhereInput] : []),
  ];

  const [rawWebsites, rawInfluencers, rawReddit, rawFunds] = await Promise.all([
    db.website.findMany({
      where: {
        AND: [
          ...websiteBaseConditions,
          ...(keywordsLower.length > 0
            ? [{
                OR: [
                  { tagSlugs: { hasSome: keywordsLower } },
                  ...keywordsLower.map((kw) => ({ description: { contains: kw, mode: "insensitive" as const } })),
                  ...keywordsLower.map((kw) => ({ name: { contains: kw, mode: "insensitive" as const } })),
                ],
              } as Prisma.WebsiteWhereInput]
            : []),
        ],
      },
      orderBy: [{ isPinned: "desc" }, { da: "desc" }],
      take: 150,
      select: { id: true, name: true, url: true, da: true, pa: true, spamScore: true, traffic: true, type: true, description: true, tagSlugs: true, categoryId: true, countryId: true },
    }),

    db.influencer.findMany({
      where: {
        AND: [
          { isActive: true },
          // Hard filter: country must match selected country OR be global (null)
          ...(countryId ? [{ OR: [{ countryId }, { countryId: null }] } as Prisma.InfluencerWhereInput] : []),
          // Hard filter: category must match if user selected one
          ...(categorySlugs.length > 0 ? [{ categorySlugs: { hasSome: categorySlugs } } as Prisma.InfluencerWhereInput] : []),
          // Soft filter: keywords match tags OR description OR name (dropped in fallback)
          ...(keywordsLower.length > 0
            ? [{
                OR: [
                  { tagSlugs: { hasSome: keywordsLower } },
                  ...keywordsLower.map((kw) => ({ description: { contains: kw, mode: "insensitive" as const } })),
                  ...keywordsLower.map((kw) => ({ name: { contains: kw, mode: "insensitive" as const } })),
                ],
              } as Prisma.InfluencerWhereInput]
            : []),
        ],
      },
      orderBy: { followersCount: "desc" },
      take: 80,
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true, countryId: true },
    }),

    db.redditChannel.findMany({
      where: {
        AND: [
          { isActive: true },
          // Reddit has no country field (global platform) — category is the hard filter
          ...(categorySlugs.length > 0 ? [{ categorySlugs: { hasSome: categorySlugs } } as Prisma.RedditChannelWhereInput] : []),
          // Soft filter: keywords match tags OR description OR name (dropped in fallback)
          ...(keywordsLower.length > 0
            ? [{
                OR: [
                  { tagSlugs: { hasSome: keywordsLower } },
                  ...keywordsLower.map((kw) => ({ description: { contains: kw, mode: "insensitive" as const } })),
                  ...keywordsLower.map((kw) => ({ name: { contains: kw, mode: "insensitive" as const } })),
                ],
              } as Prisma.RedditChannelWhereInput]
            : []),
        ],
      },
      orderBy: { totalMembers: "desc" },
      take: 80,
      select: { id: true, name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true, categorySlugs: true, tagSlugs: true, description: true },
    }),

    db.fund.findMany({
      where: {
        AND: [
          { isActive: true },
          // Hard filter: country must match selected country OR be global (null)
          ...(countryId ? [{ OR: [{ countryId }, { countryId: null }] } as Prisma.FundWhereInput] : []),
          // Hard filter: category must match if user selected one
          ...(categorySlugs.length > 0 ? [{ categorySlugs: { hasSome: categorySlugs } } as Prisma.FundWhereInput] : []),
          // Soft filter: keywords match tags OR description OR name (dropped in fallback)
          ...(keywordsLower.length > 0
            ? [{
                OR: [
                  { tagSlugs: { hasSome: keywordsLower } },
                  ...keywordsLower.map((kw) => ({ description: { contains: kw, mode: "insensitive" as const } })),
                  ...keywordsLower.map((kw) => ({ name: { contains: kw, mode: "insensitive" as const } })),
                ],
              } as Prisma.FundWhereInput]
            : []),
        ],
      },
      orderBy: { name: "asc" },
      take: 50,
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true, countryId: true },
    }),
  ]);

  // Fallback: if too few website results, drop keywords but keep country + category hard filters
  let candidateSites = rawWebsites;
  if (candidateSites.length < 10) {
    candidateSites = await db.website.findMany({
      where: { AND: websiteBaseConditions },
      orderBy: [{ isPinned: "desc" }, { da: "desc" }],
      take: 150,
      select: { id: true, name: true, url: true, da: true, pa: true, spamScore: true, traffic: true, type: true, description: true, tagSlugs: true, categoryId: true, countryId: true },
    });
  }
  // Last resort: if still empty, drop all optional filters and use top active websites.
  if (candidateSites.length === 0) {
    candidateSites = await db.website.findMany({
      where: { isActive: true, isExcluded: false },
      orderBy: [{ isPinned: "desc" }, { da: "desc" }],
      take: 150,
      select: { id: true, name: true, url: true, da: true, pa: true, spamScore: true, traffic: true, type: true, description: true, tagSlugs: true, categoryId: true, countryId: true },
    });
  }

  // Fallback 1: drop keywords, keep country + category
  // Fallback 2 (last resort): drop ALL filters — always surface some candidates
  let candidateInfluencers = rawInfluencers;
  if (candidateInfluencers.length < 5) {
    candidateInfluencers = await db.influencer.findMany({
      where: {
        AND: [
          { isActive: true },
          ...(countryId ? [{ OR: [{ countryId }, { countryId: null }] } as Prisma.InfluencerWhereInput] : []),
          ...(categorySlugs.length > 0 ? [{ categorySlugs: { hasSome: categorySlugs } } as Prisma.InfluencerWhereInput] : []),
        ],
      },
      orderBy: { followersCount: "desc" },
      take: 80,
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true, countryId: true },
    });
  }
  // Last resort: if still empty, return top influencers globally (let AI judge relevance)
  if (candidateInfluencers.length === 0) {
    candidateInfluencers = await db.influencer.findMany({
      where: { isActive: true },
      orderBy: { followersCount: "desc" },
      take: 40,
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true, countryId: true },
    });
  }

  // Fallback 1: drop keywords, keep category
  // Fallback 2 (last resort): drop ALL filters
  let candidateReddit = rawReddit;
  if (candidateReddit.length < 5) {
    candidateReddit = await db.redditChannel.findMany({
      where: {
        AND: [
          { isActive: true },
          ...(categorySlugs.length > 0 ? [{ categorySlugs: { hasSome: categorySlugs } } as Prisma.RedditChannelWhereInput] : []),
        ],
      },
      orderBy: { totalMembers: "desc" },
      take: 80,
      select: { id: true, name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true, categorySlugs: true, tagSlugs: true, description: true },
    });
  }
  if (candidateReddit.length === 0) {
    candidateReddit = await db.redditChannel.findMany({
      where: { isActive: true },
      orderBy: { totalMembers: "desc" },
      take: 40,
      select: { id: true, name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true, categorySlugs: true, tagSlugs: true, description: true },
    });
  }

  // Fallback 1: drop keywords, keep country + category
  // Fallback 2 (last resort): drop ALL filters
  let candidateFunds = rawFunds;
  if (candidateFunds.length < 5) {
    candidateFunds = await db.fund.findMany({
      where: {
        AND: [
          { isActive: true },
          ...(countryId ? [{ OR: [{ countryId }, { countryId: null }] } as Prisma.FundWhereInput] : []),
          ...(categorySlugs.length > 0 ? [{ categorySlugs: { hasSome: categorySlugs } } as Prisma.FundWhereInput] : []),
        ],
      },
      orderBy: { name: "asc" },
      take: 50,
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true, countryId: true },
    });
  }
  if (candidateFunds.length === 0) {
    candidateFunds = await db.fund.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 25,
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true, countryId: true },
    });
  }

  // ─── Step 3b: Pre-score + sort candidates ─────────────────────────────────
  // Each entity is scored using four independent rules (category, keyword, country,
  // description) and sorted with country-priority grouping: country-matched entities
  // rank first within their score tier, filling up to the section cap of 20.
  const scoredSites = sortWithCountryPriority(
    candidateSites.map((w) => {
      const entityCatSlugs = w.categoryId && categorySlugMap.has(w.categoryId)
        ? [categorySlugMap.get(w.categoryId)!]
        : [];
      const { finalScore, breakdown } = computeEntityScore(
        { tagSlugs: w.tagSlugs, categorySlugs: entityCatSlugs, countryId: w.countryId },
        userCategorySlug,
        keywordsLower,
        countryId,
        productDescWords
      );
      return { ...w, _score: finalScore, _breakdown: breakdown, _cntryMatch: scoreCountryMatch(w.countryId, countryId) > 0 };
    }),
    countryId
  );

  const scoredInfluencers = sortWithCountryPriority(
    candidateInfluencers.map((inf) => {
      const { finalScore, breakdown } = computeEntityScore(
        { tagSlugs: inf.tagSlugs, categorySlugs: inf.categorySlugs, countryId: inf.countryId },
        userCategorySlug,
        keywordsLower,
        countryId,
        productDescWords
      );
      return { ...inf, _score: finalScore, _breakdown: breakdown, _cntryMatch: scoreCountryMatch(inf.countryId, countryId) > 0 };
    }),
    countryId
  );

  const scoredReddit = sortWithCountryPriority(
    candidateReddit.map((r) => {
      const { finalScore, breakdown } = computeEntityScore(
        { tagSlugs: r.tagSlugs, categorySlugs: r.categorySlugs, countryId: null },
        userCategorySlug,
        keywordsLower,
        null, // Reddit is a global platform — country scoring disabled
        productDescWords
      );
      return { ...r, _score: finalScore, _breakdown: breakdown, _cntryMatch: false };
    }),
    null // No country grouping for Reddit (global platform)
  );

  const scoredFunds = sortWithCountryPriority(
    candidateFunds.map((f) => {
      const { finalScore, breakdown } = computeEntityScore(
        { tagSlugs: f.tagSlugs, categorySlugs: f.categorySlugs, countryId: f.countryId },
        userCategorySlug,
        keywordsLower,
        countryId,
        productDescWords
      );
      return { ...f, _score: finalScore, _breakdown: breakdown, _cntryMatch: scoreCountryMatch(f.countryId, countryId) > 0 };
    }),
    countryId
  );

  // Strip internal scoring flags and cap pool size for AI (websites only)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const finalSites = scoredSites.slice(0, 80).map(({ _score, _breakdown, _cntryMatch, ...rest }) => rest);

  // ─── Step 4: AI matching ───────────────────────────────────────────────────
  await setProgress(curationId, "calling_ai");

  // ─── AI ranks websites only (sections A/B/C) ─────────────────────────────
  // Sections D/E/F are ranked directly by pre-score below.
  // Category + country are already guaranteed by DB hard filters, so every
  // candidate in finalInfluencers/finalReddit/finalFunds is already relevant.
  let websiteResults = await rankWebsitesForCuration(
    {
      productUrl,
      keywords: keywordsLower,
      description: description ?? "",
      countryName: country?.name,
      categoryName: category?.name,
    },
    finalSites
  );

  // UI requirement: for A/B/C show only the saved short description.
  // If website description is empty, keep matchReason null (render nothing).
  const websiteDescriptionById = new Map(
    scoredSites.map((site) => [site.id, site.description?.trim() || null])
  );

  // If AI ranking is unavailable/fails, fall back to deterministic pre-scored websites
  // so sections A/B/C never render blank when candidates exist in DB.
  if (websiteResults.length === 0 && scoredSites.length > 0) {
    const MAX_WEBSITES_PER_SECTION = 20;
    const usedWebsiteIds = new Set<string>();

    const sectionTypeAliases: Record<"a" | "b" | "c", string[]> = {
      a: ["distribution", "distribution_site", "distribution-sites"],
      b: ["guest_post", "guest-post", "guest post"],
      c: ["press_release", "press-release", "press release"],
    };

    const normalizeType = (value: string) => value.toLowerCase().trim();

    const buildWebsiteFallback = (
      section: "a" | "b" | "c"
    ) => {
      const aliases = new Set(sectionTypeAliases[section].map(normalizeType));

      const typedMatches = scoredSites
        .filter((site) => aliases.has(normalizeType(site.type)) && !usedWebsiteIds.has(site.id))
        .slice(0, MAX_WEBSITES_PER_SECTION);

      const pool =
        typedMatches.length > 0
          ? typedMatches
          : scoredSites
              .filter((site) => !usedWebsiteIds.has(site.id))
              .slice(0, MAX_WEBSITES_PER_SECTION);

      return pool.map((site, index) => {
        usedWebsiteIds.add(site.id);
        return {
          websiteId: site.id,
          matchScore: Math.min(0.5 + site._score * 0.05, 1),
          matchReason: "",
          section,
          rank: index + 1,
        };
      });
    };

    websiteResults = [
      ...buildWebsiteFallback("a"),
      ...buildWebsiteFallback("b"),
      ...buildWebsiteFallback("c"),
    ];
  }

  // Always enforce description-only reason for website sections, including AI output.
  websiteResults = websiteResults.map((result) => ({
    ...result,
    matchReason: websiteDescriptionById.get(result.websiteId ?? "") ?? "",
  }));

  // ─── Build D/E/F directly from pre-scored candidates ─────────────────────
  // Ranking signals (already applied in scoredInfluencers/scoredReddit/scoredFunds):
  //   • Category match (+2 per matching category slug)
  //   • Country match (enforced as a hard DB filter — only matching rows reach here)
  //   • Keyword / tag / description match (+3/+1.5/+1)
  //   • Quality bonus (followers, members, normalized)
  //   • Past completion feedback boost
  const MAX_PER_SECTION = 20;

  const influencerResults = scoredInfluencers.slice(0, MAX_PER_SECTION).map((inf, idx) => ({
    influencerId: inf.id,
    matchScore: Math.min(0.5 + inf._score * 0.05, 1),
    matchReason: inf.description?.trim() || "",
    section: "d" as const,
    rank: idx + 1,
  }));

  const redditResults = scoredReddit.slice(0, MAX_PER_SECTION).map((r, idx) => ({
    redditChannelId: r.id,
    matchScore: Math.min(0.5 + r._score * 0.05, 1),
    matchReason: r.description?.trim() || "",
    section: "e" as const,
    rank: idx + 1,
  }));

  const fundResults = scoredFunds.slice(0, MAX_PER_SECTION).map((f, idx) => ({
    fundId: f.id,
    matchScore: Math.min(0.5 + f._score * 0.05, 1),
    matchReason: f.description?.trim() || "",
    section: "f" as const,
    rank: idx + 1,
  }));

  const allResults = [...websiteResults, ...influencerResults, ...redditResults, ...fundResults];

  // ─── Step 5: Save results ──────────────────────────────────────────────────
  await assertCurationStillExists(curationId);
  await setProgress(curationId, "saving_results");

  if (allResults.length > 0) {
    await db.curationResult.createMany({
      data: allResults.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          curationId,
          websiteId: (row.websiteId as string | undefined) ?? null,
          influencerId: (row.influencerId as string | undefined) ?? null,
          redditChannelId: (row.redditChannelId as string | undefined) ?? null,
          fundId: (row.fundId as string | undefined) ?? null,
          matchScore: r.matchScore,
          matchReason: r.matchReason,
          section: r.section,
          rank: r.rank,
        };
      }),
    });
  }

  // Mark complete
  await db.curation.update({
    where: { id: curationId },
    data: { status: "completed" },
  });

  // Cache the results permanently (immutable once generated)
  const curationWithResults = await db.curation.findUnique({
    where: { id: curationId },
    include: {
      results: {
        include: {
          website: {
            select: { name: true, url: true, da: true, pa: true, spamScore: true, traffic: true, type: true },
          },
          influencer: {
            select: { name: true, platform: true, followersCount: true, profileLink: true },
          },
          redditChannel: {
            select: { name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true },
          },
          fund: {
            select: { name: true, websiteUrl: true, investmentStage: true, ticketSize: true, logoUrl: true },
          },
        },
        orderBy: [{ section: "asc" }, { rank: "asc" }],
      },
    },
  });

  if (curationWithResults) {
    await redis.set(`curation:${curationId}:data`, curationWithResults);
  }

  // Invalidate user profile (credits changed)
  await invalidateUserProfile(userId);

  // Send completion notification
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (user) {
    sendCurationCompleteEmail(
      user.email,
      user.name ?? "there",
      curationId,
      productUrl
    ).catch(() => {});

    // Create in-app notification
    await db.notification.create({
      data: {
        userId,
        type: "curation_complete",
        title: "Curation complete",
        message: `Your curation for ${productUrl} is ready with ${allResults.length} results.`,
      },
    });
  }

  await setProgress(curationId, "complete");
}
