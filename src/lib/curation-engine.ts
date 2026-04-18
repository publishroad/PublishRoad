import { Client } from "@upstash/qstash";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { redis } from "@/lib/redis";
import {
  rankWebsitesForCuration,
  rankSocialAndFundsForCuration,
  expandCurationIntent,
} from "@/lib/curation-ai";
import {
  extractDescWords,
  computeEntityScore,
  scoreCountryMatch,
  sortWithCountryPriority,
} from "@/lib/curation-scoring";
import { sendCurationCompleteEmail } from "@/lib/email";
import { invalidateUserProfile } from "@/lib/cache";
import {
  type CurationSectionKey,
  getGlobalEnabledCurationSections,
  normalizeEnabledCurationSections,
  setCurationEnabledSectionsSnapshotTx,
} from "@/lib/curation-steps-config";

interface RunCurationInput {
  userId: string;
  productUrl: string;
  countryId?: string | null;
  categoryId?: string | null;
  keywords: string[];
  problemStatement: string;
  solutionStatement: string;
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

type RankedWebsiteCandidate = {
  id: string;
  type: string;
  starRating?: number | null;
  description?: string | null;
  _score: number;
};

type WebsiteSectionResult = {
  websiteId: string;
  matchScore: number;
  matchReason: string;
  section: "a" | "b" | "c";
  rank: number;
};

type PressReleaseCountryMode = "specific_country" | "worldwide";

const WEBSITE_SECTION_DB_TYPES = ["distribution", "guest_post", "press_release"] as const;

function countResultsBySection<T extends { section: string }>(results: T[]) {
  return results.reduce<Record<string, number>>((acc, result) => {
    acc[result.section] = (acc[result.section] ?? 0) + 1;
    return acc;
  }, {});
}

function getPressReleaseCountryMode(countryId: string | null | undefined): PressReleaseCountryMode {
  return countryId ? "specific_country" : "worldwide";
}

function isStrictPressReleaseEligible(
  site: { countryId?: string | null; websiteCountries: Array<{ countryId: string }> },
  countryId: string | null | undefined,
  mode: PressReleaseCountryMode
): boolean {
  if (mode === "specific_country") {
    if (!countryId) return false;
    return site.countryId === countryId || site.websiteCountries.some((wc) => wc.countryId === countryId);
  }

  return site.countryId == null;
}

function getWebsiteStarTier(starRating?: number | null): 0 | 3 | 4 | 5 {
  if (starRating === 5) return 5;
  if (starRating === 4) return 4;
  if (starRating === 3) return 3;
  return 0;
}

function buildTieredWebsiteResults<T extends RankedWebsiteCandidate>(input: {
  section: "a" | "b" | "c";
  pool: T[];
  maxPerSection: number;
  usedWebsiteIds: Set<string>;
  getAiScore: (siteId: string) => number | undefined;
  getAiReason: (siteId: string) => string | undefined;
  toDeterministicScore: (score: number) => number;
}): WebsiteSectionResult[] {
  const {
    section,
    pool,
    maxPerSection,
    usedWebsiteIds,
    getAiScore,
    getAiReason,
    toDeterministicScore,
  } = input;

  const scoredPool = pool
    .filter((site) => !usedWebsiteIds.has(site.id))
    .map((site) => {
      const aiScore = getAiScore(site.id);
      const aiReason = getAiReason(site.id)?.trim() ?? "";
      const fallbackReason = site.description?.trim() || "";

      return {
        site,
        starTier: getWebsiteStarTier(site.starRating),
        effectiveScore: aiScore ?? toDeterministicScore(site._score),
        matchReason: aiReason || fallbackReason,
      };
    });

  const sortWithinTier = (a: (typeof scoredPool)[number], b: (typeof scoredPool)[number]) => {
    if (b.effectiveScore !== a.effectiveScore) return b.effectiveScore - a.effectiveScore;
    if ((b.site.starRating ?? 0) !== (a.site.starRating ?? 0)) {
      return (b.site.starRating ?? 0) - (a.site.starRating ?? 0);
    }
    return b.site._score - a.site._score;
  };

  const ordered = [5, 4, 3, 0]
    .flatMap((tier) => scoredPool.filter((item) => item.starTier === tier).sort(sortWithinTier))
    .slice(0, maxPerSection);

  return ordered.map((item, index) => {
    usedWebsiteIds.add(item.site.id);
    return {
      websiteId: item.site.id,
      matchScore: item.effectiveScore,
      matchReason: item.matchReason,
      section,
      rank: index + 1,
    };
  });
}

export async function runCuration(input: RunCurationInput) {
  const {
    userId,
    productUrl,
    countryId,
    categoryId,
    keywords,
    problemStatement,
    solutionStatement,
    description,
  } = input;

  const LIFETIME_MONTHLY_CREDITS = 15;
  const enabledSectionsSnapshot = await getGlobalEnabledCurationSections();

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
        problemStatement,
        solutionStatement,
        description,
        status: "pending",
      },
    });

    await setCurationEnabledSectionsSnapshotTx({
      tx,
      curationId: curation.id,
      sections: enabledSectionsSnapshot,
    }).catch(() => {
      // Best effort: if migrations are not applied yet, generation still continues.
    });

    return curation;
  });

  // Refresh cached profile immediately so the deducted credit is visible while
  // the curation is still processing.
  await invalidateUserProfile(userId).catch(() => {});

  // ─── Step 2: Enqueue via QStash (survives serverless function termination) ──
  const qstashToken = process.env.QSTASH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (qstashToken && appUrl) {
    const client = new Client({ token: qstashToken });
    const processorUrl = `${appUrl}/api/internal/curations/process`;

    await client
      .publishJSON({
        url: processorUrl,
        body: {
          curationId: result.id,
          userId,
          productUrl,
          keywords,
          problemStatement,
          solutionStatement,
          description,
          countryId: countryId ?? null,
          categoryId: categoryId ?? null,
          enabledSectionsSnapshot,
        },
        retries: 2,
        headers: {
          // QStash forwards all custom headers — processor verifies signature instead
        },
      })
      .catch(async (err) => {
        // QStash publish failed — fall back to local fire-and-forget so the
        // user still gets results (acceptable in dev / if QStash is misconfigured).
        console.error(`[CurationQueue] QStash publish failed for ${result.id}, falling back to local:`, err);
        runProcessCurationLocal(result.id, userId, productUrl, keywords, problemStatement, solutionStatement, description, countryId, categoryId, enabledSectionsSnapshot);
      });
  } else {
    // QStash not configured (local dev) — run inline
    runProcessCurationLocal(result.id, userId, productUrl, keywords, problemStatement, solutionStatement, description, countryId, categoryId, enabledSectionsSnapshot);
  }

  return result;
}

function runProcessCurationLocal(
  curationId: string,
  userId: string,
  productUrl: string,
  keywords: string[],
  problemStatement: string,
  solutionStatement: string,
  description: string | null,
  countryId?: string | null,
  categoryId?: string | null,
  enabledSectionsSnapshot: CurationSectionKey[] = ["a", "b", "c", "d", "e", "f"]
) {
  processCuration(
    curationId,
    userId,
    productUrl,
    keywords,
    problemStatement,
    solutionStatement,
    description,
    countryId,
    categoryId,
    enabledSectionsSnapshot
  ).catch(async (err) => {
    if (err instanceof Error && err.message === "CURATION_CANCELLED") {
      return;
    }

    console.error(`Curation ${curationId} failed:`, err);

    const markedFailed = await db.curation.updateMany({
      where: {
        id: curationId,
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

    await setProgress(curationId, "error").catch(() => {});

    await db.user.update({
      where: { id: userId },
      data: { creditsRemaining: { increment: 1 } },
    }).catch(() => {});
    await invalidateUserProfile(userId).catch(() => {});
  });
}

export async function processCuration(
  curationId: string,
  userId: string,
  productUrl: string,
  keywords: string[],
  problemStatement: string,
  solutionStatement: string,
  description: string | null,
  countryId?: string | null,
  categoryId?: string | null,
  enabledSectionsSnapshot: CurationSectionKey[] = ["a", "b", "c", "d", "e", "f"]
) {
  // Idempotency guard: skip if already completed or failed (handles QStash retries)
  const existing = await db.curation.findUnique({
    where: { id: curationId },
    select: { status: true },
  });
  if (!existing || existing.status === "completed" || existing.status === "failed") {
    return;
  }

  await assertCurationStillExists(curationId);
  await setProgress(curationId, "started");

  await db.curation.update({
    where: { id: curationId },
    data: { status: "processing" },
  });

  // ─── Step 3: Fetch candidate pools ────────────────────────────────────────
  await assertCurationStillExists(curationId);
  await setProgress(curationId, "fetching_sites");

  // Fetch country name + categories. Fail-open so a temporary metadata issue
  // does not abort the entire curation run.
  const [country, availableCategories] = await Promise.all([
    countryId
      ? db.country.findUnique({ where: { id: countryId }, select: { name: true } }).catch(() => null)
      : Promise.resolve(null),
    db.category.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } }).catch(() => []),
  ]);

  // ── 3a: AI keyword expansion + category inference ────────────────────────
  // Expands the user's keywords using their business description and infers
  // the best matching category if the user didn't select one.
  const { expandedKeywords, inferredCategoryId } = await expandCurationIntent({
    productUrl,
    problemStatement,
    solutionStatement,
    keywords,
    availableCategories,
  });

  // Use inferred category if user didn't explicitly pick one.
  // If metadata is stale or the selected category was deactivated after form
  // submission, continue with a broad fallback instead of hard-failing.
  const effectiveCategoryId = categoryId ?? inferredCategoryId;

  let category = effectiveCategoryId
    ? (availableCategories.find((c) => c.id === effectiveCategoryId) ?? null)
    : null;

  if (!category && effectiveCategoryId) {
    category = await db.category
      .findUnique({ where: { id: effectiveCategoryId }, select: { id: true, slug: true, name: true } })
      .catch(() => null);
  }

  if (!effectiveCategoryId) {
    console.warn("[Curation] No category available after expansion; continuing without category hard filter", {
      curationId,
      providedCategoryId: categoryId ?? null,
    });
  }

  if (effectiveCategoryId && !category) {
    console.warn("[Curation] Selected category metadata not found; continuing with legacy category-id filtering only", {
      curationId,
      effectiveCategoryId,
    });
  }

  const categorySlugs = category ? [category.slug] : [];
  // Use expanded keywords (includes originals + AI-derived synonyms) for all DB queries
  const keywordsLower = expandedKeywords.length > 0
    ? expandedKeywords
    : keywords.map((k) => k.toLowerCase());

  // Resolved slug for the effective category — used as the target in scoreCategoryMatch
  const userCategorySlug = category?.slug ?? "";

  // Extract meaningful words from product description for description-overlap scoring
  const productDescWords = extractDescWords(description ?? "");

  const categoryIdToSlug = new Map(availableCategories.map((entry) => [entry.id, entry.slug]));

  const websiteCategoriesSupportProbe = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('public.website_categories') IS NOT NULL AS "exists"
  `.catch(() => [{ exists: false }]);
  const hasWebsiteCategoriesTable = Boolean(websiteCategoriesSupportProbe[0]?.exists);

  const websiteCountriesSupportProbe = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('public.website_countries') IS NOT NULL AS "exists"
  `.catch(() => [{ exists: false }]);
  const hasWebsiteCountriesTable = Boolean(websiteCountriesSupportProbe[0]?.exists);

  if (!hasWebsiteCategoriesTable) {
    console.warn("[Curation] website_categories table not available; falling back to legacy primary category matching");
  }

  if (!hasWebsiteCountriesTable) {
    console.warn("[Curation] website_countries table not available; falling back to legacy country matching");
  }

  const websiteSelect: Prisma.WebsiteSelect = {
    id: true,
    name: true,
    url: true,
    da: true,
    pa: true,
    spamScore: true,
    traffic: true,
    type: true,
    description: true,
    tagSlugs: true,
    categoryId: true,
    countryId: true,
    starRating: true,
    ...(hasWebsiteCategoriesTable ? { websiteCategories: { select: { category: { select: { slug: true } } } } } : {}),
    ...(hasWebsiteCountriesTable ? { websiteCountries: { select: { countryId: true } } } : {}),
  };

  const normalizeWebsiteRows = <T extends {
    websiteCountries?: Array<{ countryId: string }>;
    websiteCategories?: Array<{ category: { slug: string | null } }>;
  }>(
    rows: T[]
  ): Array<
    Omit<T, "websiteCountries" | "websiteCategories"> & {
      websiteCountries: Array<{ countryId: string }>;
      websiteCategories: Array<{ category: { slug: string | null } }>;
    }
  > => {
    return rows.map((row) => ({
      ...row,
      websiteCountries: Array.isArray(row.websiteCountries) ? row.websiteCountries : [],
      websiteCategories: Array.isArray(row.websiteCategories) ? row.websiteCategories : [],
    }));
  };

  // Build website base conditions as an AND array to avoid key conflicts
  const websiteBaseConditions: Prisma.WebsiteWhereInput[] = [
    { isActive: true },
    { isExcluded: false },
    // Match via join table so multi-category sites are included (not just primary categoryId)
    ...(effectiveCategoryId
      ? [
          (hasWebsiteCategoriesTable
            ? { websiteCategories: { some: { categoryId: effectiveCategoryId } } }
            : { categoryId: effectiveCategoryId }) as Prisma.WebsiteWhereInput,
        ]
      : []),
  ];

  const [rawWebsiteRows, rawInfluencers, rawReddit, rawFunds] = await Promise.all([
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
      orderBy: [{ starRating: "desc" }, { da: "desc" }],
      take: 150,
      select: websiteSelect,
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
      orderBy: [{ starRating: "desc" }, { followersCount: "desc" }],
      take: 80,
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true, countryId: true, starRating: true },
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
      orderBy: [{ starRating: "desc" }, { totalMembers: "desc" }],
      take: 80,
      select: { id: true, name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true, categorySlugs: true, tagSlugs: true, description: true, starRating: true },
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
      orderBy: [{ starRating: "desc" }, { name: "asc" }],
      take: 50,
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true, countryId: true, starRating: true },
    }),
  ]);

  const rawWebsites = normalizeWebsiteRows(rawWebsiteRows as Array<{ websiteCountries?: Array<{ countryId: string }> }>);

  // Fallback: if too few website results, drop keywords but keep country + category hard filters
  let candidateSites = rawWebsites;
  if (candidateSites.length < 10) {
    candidateSites = normalizeWebsiteRows(await db.website.findMany({
      where: { AND: websiteBaseConditions },
      orderBy: [{ starRating: "desc" }, { da: "desc" }],
      take: 150,
      select: websiteSelect,
    }) as Array<{ websiteCountries?: Array<{ countryId: string }> }>);
  }
  // Last resort: if still empty, keep the selected category hard filter and
  // relax country only. Never widen website results outside the chosen category.
  if (candidateSites.length === 0) {
    candidateSites = normalizeWebsiteRows(await db.website.findMany({
      where: {
        isActive: true,
        isExcluded: false,
        ...(effectiveCategoryId
          ? (hasWebsiteCategoriesTable
              ? { websiteCategories: { some: { categoryId: effectiveCategoryId } } }
              : { categoryId: effectiveCategoryId })
          : {}),
      },
      orderBy: [{ starRating: "desc" }, { da: "desc" }],
      take: 150,
      select: websiteSelect,
    }) as Array<{ websiteCountries?: Array<{ countryId: string }> }>);
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
      orderBy: [{ starRating: "desc" }, { followersCount: "desc" }],
      take: 80,
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true, countryId: true, starRating: true },
    });
  }
  // Last resort: if still empty, return top influencers globally (let AI judge relevance)
  if (candidateInfluencers.length === 0) {
    candidateInfluencers = await db.influencer.findMany({
      where: { isActive: true },
      orderBy: [{ starRating: "desc" }, { followersCount: "desc" }],
      take: 40,
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true, countryId: true, starRating: true },
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
      orderBy: [{ starRating: "desc" }, { totalMembers: "desc" }],
      take: 80,
      select: { id: true, name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true, categorySlugs: true, tagSlugs: true, description: true, starRating: true },
    });
  }
  if (candidateReddit.length === 0) {
    candidateReddit = await db.redditChannel.findMany({
      where: { isActive: true },
      orderBy: [{ starRating: "desc" }, { totalMembers: "desc" }],
      take: 40,
      select: { id: true, name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true, categorySlugs: true, tagSlugs: true, description: true, starRating: true },
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
      orderBy: [{ starRating: "desc" }, { name: "asc" }],
      take: 50,
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true, countryId: true, starRating: true },
    });
  }
  if (candidateFunds.length === 0) {
    candidateFunds = await db.fund.findMany({
      where: { isActive: true },
      orderBy: [{ starRating: "desc" }, { name: "asc" }],
      take: 25,
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true, countryId: true, starRating: true },
    });
  }

  // ─── Step 3b: Guaranteed inclusion for 3-5 star sites ────────────────────
  // Fetch admin-starred gold-standard sites for this category and inject them
  // into the candidate pool, bypassing keyword soft filters. These sites are
  // always evaluated by the AI unless there is a clear platform mismatch.
  if (effectiveCategoryId) {
    const prioritySites = normalizeWebsiteRows(await db.website.findMany({
      where: {
        isActive: true,
        isExcluded: false,
        starRating: { gte: 3 },
        ...(hasWebsiteCategoriesTable
          ? { websiteCategories: { some: { categoryId: effectiveCategoryId } } }
          : { categoryId: effectiveCategoryId }),
      },
      select: websiteSelect,
    }) as Array<{ websiteCountries?: Array<{ countryId: string }> }>);
    const existingIds = new Set(candidateSites.map((s) => s.id));
    for (const site of prioritySites) {
      if (!existingIds.has(site.id)) {
        candidateSites.push(site);
        existingIds.add(site.id);
      }
    }
  }

  // Backfill each website section independently so distribution, guest-post,
  // and press-release sections can each reach a full result set.
  const existingWebsiteIds = new Set(candidateSites.map((site) => site.id));
  const websiteTypeCounts = new Map<string, number>();
  for (const site of candidateSites) {
    websiteTypeCounts.set(site.type, (websiteTypeCounts.get(site.type) ?? 0) + 1);
  }

  for (const websiteType of WEBSITE_SECTION_DB_TYPES) {
    const currentCount = websiteTypeCounts.get(websiteType) ?? 0;
    if (currentCount >= 20) {
      continue;
    }

    const missingCount = 20 - currentCount;
    const pressReleaseCountryMode = getPressReleaseCountryMode(countryId);
    const typedBackfill = normalizeWebsiteRows(await db.website.findMany({
      where: {
        isActive: true,
        isExcluded: false,
        type: websiteType,
        ...(websiteType === "press_release" && pressReleaseCountryMode === "specific_country" && countryId
          ? {
              OR: hasWebsiteCountriesTable
                ? [{ countryId }, { websiteCountries: { some: { countryId } } }]
                : [{ countryId }],
            }
          : {}),
        ...(websiteType === "press_release" && pressReleaseCountryMode === "worldwide"
          ? { countryId: null }
          : {}),
        ...(effectiveCategoryId
          ? (hasWebsiteCategoriesTable
              ? { websiteCategories: { some: { categoryId: effectiveCategoryId } } }
              : { categoryId: effectiveCategoryId })
          : {}),
      },
      orderBy: [{ starRating: "desc" }, { da: "desc" }],
      take: missingCount + 20,
      select: websiteSelect,
    }) as Array<{ websiteCountries?: Array<{ countryId: string }> }>);

    for (const site of typedBackfill) {
      if (existingWebsiteIds.has(site.id)) {
        continue;
      }
      candidateSites.push(site);
      existingWebsiteIds.add(site.id);
      websiteTypeCounts.set(site.type, (websiteTypeCounts.get(site.type) ?? 0) + 1);

      if ((websiteTypeCounts.get(websiteType) ?? 0) >= 20) {
        break;
      }
    }
  }

  console.info("[Curation] Website candidate counts", {
    curationId,
    categoryId: effectiveCategoryId,
    categorySlug: userCategorySlug,
    countryId: countryId ?? null,
    websiteCandidates: {
      distribution: websiteTypeCounts.get("distribution") ?? 0,
      guest_post: websiteTypeCounts.get("guest_post") ?? 0,
      press_release: websiteTypeCounts.get("press_release") ?? 0,
    },
  });

  // Guaranteed inclusion for 4-5 star influencers, reddit channels, and funds
  if (categorySlugs.length > 0) {
    const [priorityInfluencers, priorityReddit, priorityFunds] = await Promise.all([
      db.influencer.findMany({
        where: { isActive: true, starRating: { gte: 4 }, categorySlugs: { hasSome: categorySlugs } },
        select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true, countryId: true, starRating: true },
      }),
      db.redditChannel.findMany({
        where: { isActive: true, starRating: { gte: 4 }, categorySlugs: { hasSome: categorySlugs } },
        select: { id: true, name: true, url: true, totalMembers: true, weeklyVisitors: true, postingDifficulty: true, categorySlugs: true, tagSlugs: true, description: true, starRating: true },
      }),
      db.fund.findMany({
        where: { isActive: true, starRating: { gte: 4 }, categorySlugs: { hasSome: categorySlugs } },
        select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true, countryId: true, starRating: true },
      }),
    ]);
    const existingInfluencerIds = new Set(candidateInfluencers.map((i) => i.id));
    for (const inf of priorityInfluencers) {
      if (!existingInfluencerIds.has(inf.id)) { candidateInfluencers.push(inf); existingInfluencerIds.add(inf.id); }
    }
    const existingRedditIds = new Set(candidateReddit.map((r) => r.id));
    for (const r of priorityReddit) {
      if (!existingRedditIds.has(r.id)) { candidateReddit.push(r); existingRedditIds.add(r.id); }
    }
    const existingFundIds = new Set(candidateFunds.map((f) => f.id));
    for (const f of priorityFunds) {
      if (!existingFundIds.has(f.id)) { candidateFunds.push(f); existingFundIds.add(f.id); }
    }
  }

  // ─── Step 3c: Pre-score + sort candidates ─────────────────────────────────
  // Website scoring for A/B/C is country-agnostic by design. Country filtering
  // is applied only in Section C eligibility rules.
  const scoredSites = candidateSites.map((w) => {
      const relationCategorySlugs = w.websiteCategories
        .map((wc) => wc.category.slug)
        .filter((slug): slug is string => Boolean(slug));
      const entityCatSlugs = relationCategorySlugs.length > 0
        ? relationCategorySlugs
        : w.categoryId
          ? [categoryIdToSlug.get(w.categoryId)].filter((slug): slug is string => Boolean(slug))
          : [];
      const { finalScore, breakdown } = computeEntityScore(
        {
          tagSlugs: w.tagSlugs,
          categorySlugs: entityCatSlugs,
          countryId: w.countryId,
          starRating: w.starRating,
        },
        userCategorySlug,
        keywordsLower,
        null,
        productDescWords
      );
      return {
        ...w,
        _score: finalScore,
        _breakdown: breakdown,
      };
    });

  const scoredInfluencers = sortWithCountryPriority(
    candidateInfluencers.map((inf) => {
      const { finalScore, breakdown } = computeEntityScore(
        { tagSlugs: inf.tagSlugs, categorySlugs: inf.categorySlugs, countryId: inf.countryId, starRating: inf.starRating },
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
        { tagSlugs: r.tagSlugs, categorySlugs: r.categorySlugs, countryId: null, starRating: r.starRating },
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
        { tagSlugs: f.tagSlugs, categorySlugs: f.categorySlugs, countryId: f.countryId, starRating: f.starRating },
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
  const finalSites = scoredSites.slice(0, 80).map(({ _score, _breakdown, ...rest }) => rest);

  // ─── Step 4: AI matching ───────────────────────────────────────────────────
  await setProgress(curationId, "calling_ai");

  // AI ranks websites + social/reddit/funds with semantic fit.
  // Deterministic pre-score remains as fallback for resilience.
  const productCtx = {
    productUrl,
    problemStatement,
    solutionStatement,
    keywords: keywordsLower,
    countryName: country?.name,
    categoryName: category?.name,
  };

  const finalInfluencers = scoredInfluencers.slice(0, 60);
  const finalReddit = scoredReddit.slice(0, 60);
  const finalFunds = scoredFunds.slice(0, 40);

  const [aiWebsiteResults, socialAndFundResults] = await Promise.all([
    rankWebsitesForCuration(productCtx, finalSites),
    rankSocialAndFundsForCuration(
      productCtx,
      finalInfluencers,
      finalReddit,
      finalFunds
    ),
  ]);

  // ─── Description-priority ranking for all sections A-F ────────────────────
  // Priority order: entities with descriptions first, then entities without
  // descriptions. Within each group, semantic AI score (if present) or
  // deterministic score is used.
  const MAX_PER_SECTION = 20;
  const toDeterministicScore = (score: number) => Math.min(0.5 + score * 0.05, 1);

  const aiWebsiteScoreBySection = {
    a: new Map(
      aiWebsiteResults
        .filter((r) => r.section === "a" && r.websiteId)
        .map((r) => [r.websiteId!, r.matchScore])
    ),
    b: new Map(
      aiWebsiteResults
        .filter((r) => r.section === "b" && r.websiteId)
        .map((r) => [r.websiteId!, r.matchScore])
    ),
    c: new Map(
      aiWebsiteResults
        .filter((r) => r.section === "c" && r.websiteId)
        .map((r) => [r.websiteId!, r.matchScore])
    ),
  };

  const aiWebsiteReasonBySection = {
    a: new Map(
      aiWebsiteResults
        .filter((r) => r.section === "a" && r.websiteId)
        .map((r) => [r.websiteId!, r.matchReason])
    ),
    b: new Map(
      aiWebsiteResults
        .filter((r) => r.section === "b" && r.websiteId)
        .map((r) => [r.websiteId!, r.matchReason])
    ),
    c: new Map(
      aiWebsiteResults
        .filter((r) => r.section === "c" && r.websiteId)
        .map((r) => [r.websiteId!, r.matchReason])
    ),
  };

  const sectionTypeAliases: Record<"a" | "b" | "c", string[]> = {
    a: ["distribution", "distribution_site", "distribution-sites"],
    b: ["guest_post", "guest-post", "guest post"],
    c: ["press_release", "press-release", "press release"],
  };
  const normalizeType = (value: string) => value.toLowerCase().trim();
  const usedWebsiteIds = new Set<string>();
  const pressReleaseCountryMode = getPressReleaseCountryMode(countryId);

  const buildWebsiteSectionResults = (section: "a" | "b" | "c") => {
    const aliases = new Set(sectionTypeAliases[section].map(normalizeType));
    const typedPool = scoredSites.filter((site) => {
      if (!aliases.has(normalizeType(site.type)) || usedWebsiteIds.has(site.id)) return false;
      if (section !== "c") return true;
      return isStrictPressReleaseEligible(site, countryId, pressReleaseCountryMode);
    });

    const pool = (() => {
      if (typedPool.length > 0 || section === "c") {
        // Section C never widens outside strict press_release eligibility.
        return typedPool;
      }

      // A/B may fallback, but avoid consuming press_release inventory reserved for C.
      return scoredSites.filter(
        (site) =>
          !usedWebsiteIds.has(site.id) &&
          normalizeType(site.type) !== "press_release"
      );
    })();

    return buildTieredWebsiteResults({
      section,
      pool,
      maxPerSection: MAX_PER_SECTION,
      usedWebsiteIds,
      getAiScore: (siteId) => aiWebsiteScoreBySection[section].get(siteId),
      getAiReason: (siteId) => aiWebsiteReasonBySection[section].get(siteId),
      toDeterministicScore,
    });
  };

  const websiteResults = [
    ...buildWebsiteSectionResults("a"),
    ...buildWebsiteSectionResults("b"),
    ...buildWebsiteSectionResults("c"),
  ];

  const pressReleaseCount = websiteResults.filter((r) => r.section === "c").length;
  console.info("[Curation] Press release strict country filter", {
    curationId,
    mode: pressReleaseCountryMode,
    countryId: countryId ?? null,
    results: pressReleaseCount,
  });

  const influencerDescriptionById = new Map(
    scoredInfluencers.map((inf) => [inf.id, inf.description?.trim() || ""])
  );
  const redditDescriptionById = new Map(
    scoredReddit.map((r) => [r.id, r.description?.trim() || ""])
  );
  const fundDescriptionById = new Map(
    scoredFunds.map((f) => [f.id, f.description?.trim() || ""])
  );

  const aiInfluencerScoreById = new Map(
    socialAndFundResults
      .filter((result) => result.section === "d" && result.influencerId)
      .map((result) => [result.influencerId!, result.matchScore])
  );
  const aiInfluencerReasonById = new Map(
    socialAndFundResults
      .filter((result) => result.section === "d" && result.influencerId)
      .map((result) => [result.influencerId!, result.matchReason])
  );
  const aiRedditScoreById = new Map(
    socialAndFundResults
      .filter((result) => result.section === "e" && result.redditChannelId)
      .map((result) => [result.redditChannelId!, result.matchScore])
  );
  const aiRedditReasonById = new Map(
    socialAndFundResults
      .filter((result) => result.section === "e" && result.redditChannelId)
      .map((result) => [result.redditChannelId!, result.matchReason])
  );
  const aiFundScoreById = new Map(
    socialAndFundResults
      .filter((result) => result.section === "f" && result.fundId)
      .map((result) => [result.fundId!, result.matchScore])
  );
  const aiFundReasonById = new Map(
    socialAndFundResults
      .filter((result) => result.section === "f" && result.fundId)
      .map((result) => [result.fundId!, result.matchReason])
  );

  // Helper: tier-sort any entity pool by star rating (5→4→3→0) then by
  // effective score within each tier — mirrors buildTieredWebsiteResults.
  function tierSort<T extends { id: string; starRating?: number | null; _score: number }>(
    pool: T[],
    getScore: (id: string) => number | undefined,
    getDescription: (id: string) => string,
    getAiReason: (id: string) => string,
  ) {
    const scored = pool.map((entity) => {
      const aiScore = getScore(entity.id);
      const aiReason = getAiReason(entity.id).trim();
      const fallbackReason = getDescription(entity.id);
      return {
        entity,
        starTier: getWebsiteStarTier(entity.starRating),
        effectiveScore: aiScore ?? toDeterministicScore(entity._score),
        matchReason: aiReason || fallbackReason,
      };
    });

    const sortWithinTier = (
      a: (typeof scored)[number],
      b: (typeof scored)[number],
    ) => {
      if (b.effectiveScore !== a.effectiveScore) return b.effectiveScore - a.effectiveScore;
      return (b.entity.starRating ?? 0) - (a.entity.starRating ?? 0);
    };

    return [5, 4, 3, 0]
      .flatMap((tier) => scored.filter((item) => item.starTier === tier).sort(sortWithinTier))
      .slice(0, MAX_PER_SECTION);
  }

  const influencerResults = tierSort(
    scoredInfluencers,
    (id) => aiInfluencerScoreById.get(id),
    (id) => influencerDescriptionById.get(id) ?? "",
    (id) => aiInfluencerReasonById.get(id) ?? "",
  ).map((item, idx) => ({
    influencerId: item.entity.id,
    matchScore: item.effectiveScore,
    matchReason: item.matchReason,
    section: "d" as const,
    rank: idx + 1,
  }));

  const redditResults = tierSort(
    scoredReddit,
    (id) => aiRedditScoreById.get(id),
    (id) => redditDescriptionById.get(id) ?? "",
    (id) => aiRedditReasonById.get(id) ?? "",
  ).map((item, idx) => ({
    redditChannelId: item.entity.id,
    matchScore: item.effectiveScore,
    matchReason: item.matchReason,
    section: "e" as const,
    rank: idx + 1,
  }));

  const fundResults = tierSort(
    scoredFunds,
    (id) => aiFundScoreById.get(id),
    (id) => fundDescriptionById.get(id) ?? "",
    (id) => aiFundReasonById.get(id) ?? "",
  ).map((item, idx) => ({
    fundId: item.entity.id,
    matchScore: item.effectiveScore,
    matchReason: item.matchReason,
    section: "f" as const,
    rank: idx + 1,
  }));

  const allResults = [...websiteResults, ...influencerResults, ...redditResults, ...fundResults];
  const enabledSections = new Set(normalizeEnabledCurationSections(enabledSectionsSnapshot));
  const filteredResults = allResults.filter((result) => enabledSections.has(result.section));

  console.info("[Curation] Final section counts", {
    curationId,
    preFilter: countResultsBySection(allResults),
    postFilter: countResultsBySection(filteredResults),
  });

  // ─── Step 5: Save results ──────────────────────────────────────────────────
  await assertCurationStillExists(curationId);
  await setProgress(curationId, "saving_results");

  if (filteredResults.length > 0) {
    await db.curationResult.createMany({
      data: filteredResults.map((r) => {
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
        message: `Your curation for ${productUrl} is ready with ${filteredResults.length} results.`,
      },
    });
  }

  await setProgress(curationId, "complete");
}
