import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { redis } from "@/lib/redis";
import { rankAllCandidatesForCuration, expandCurationIntent } from "@/lib/ai";
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

// ─────────────────────────────────────────────────────────────────────────────
// Pre-scoring: rank candidates by relevance before sending to AI.
// Scoring signals (higher = more relevant):
//   +3 per keyword that exactly matches a tagSlug
//   +1.5 per keyword found in description text
//   +1 per keyword found in name
//   +2 per category slug match
//   up to +5 from user completion feedback (proven relevance from past curations)
//   up to +2 quality bonus (DA for websites, normalized followers/members for others)
// ─────────────────────────────────────────────────────────────────────────────
function scoreCandidateRelevance(
  entity: {
    tagSlugs: string[];
    categorySlugs?: string[];
    description?: string | null;
    name: string;
  },
  expandedKeywords: string[],
  targetCategorySlugs: string[],
  completionCount: number,
  qualityBonus: number
): number {
  let score = 0;
  const descLower = (entity.description ?? "").toLowerCase();
  const nameLower = entity.name.toLowerCase();

  for (const kw of expandedKeywords) {
    if (entity.tagSlugs.includes(kw)) score += 3;
    else if (descLower.includes(kw)) score += 1.5;
    else if (nameLower.includes(kw)) score += 1;
  }

  if (entity.categorySlugs && targetCategorySlugs.length > 0) {
    const hits = targetCategorySlugs.filter((cs) => entity.categorySlugs!.includes(cs)).length;
    score += hits * 2;
  }

  // Cap feedback bonus at 5 so a heavily-completed entity doesn't dominate
  score += Math.min(completionCount * 0.5, 5);
  score += qualityBonus;

  return score;
}

export async function runCuration(input: RunCurationInput) {
  const { userId, productUrl, countryId, categoryId, keywords, description } = input;

  // ─── Step 1: Credit check + deduction in a single transaction ─────────────
  // We use a raw transaction with SELECT FOR UPDATE to prevent race conditions
  // when two requests arrive simultaneously with credits=1.
  const result = await db.$transaction(async (tx) => {
    const user = await tx.$queryRaw<Array<{ credits_remaining: number }>>(
      Prisma.sql`SELECT credits_remaining FROM "users" WHERE id::text = ${userId} FOR UPDATE`
    );

    const credits = user[0]?.credits_remaining ?? 0;

    if (credits === 0) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    // Deduct 1 credit (unless unlimited = -1)
    if (credits !== -1) {
      await tx.$executeRaw(
        Prisma.sql`UPDATE "users" SET credits_remaining = credits_remaining - 1 WHERE id::text = ${userId}`
      );
    }

    // Create curation record
    const curation = await tx.curation.create({
      data: {
        userId,
        productUrl,
        countryId: countryId || null,
        keywords,
        description,
        status: "pending",
      },
    });

    return curation;
  });

  // ─── Step 2: Process asynchronously (fire and forget) ────────────────────
  // In production this would be a background job/queue (e.g., Upstash QStash).
  // For simplicity here we use a detached async function.
  processCuration(result.id, userId, productUrl, keywords, description, countryId, categoryId).catch(
    async (err) => {
      console.error(`Curation ${result.id} failed:`, err);
      await db.curation.update({
        where: { id: result.id },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message.slice(0, 1000) : "Unknown curation error",
        },
      });
      await setProgress(result.id, "error");

      // Refund the credit
      await db.user.update({
        where: { id: userId },
        data: { creditsRemaining: { increment: 1 } },
      }).catch(() => {});
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
  await setProgress(curationId, "started");

  await db.curation.update({
    where: { id: curationId },
    data: { status: "processing" },
  });

  // ─── Step 3: Fetch candidate pools ────────────────────────────────────────
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

  // Build website base conditions as an AND array to avoid key conflicts
  const websiteBaseConditions: Prisma.WebsiteWhereInput[] = [
    { isActive: true },
    { isExcluded: false },
    ...(countryId ? [{ OR: [{ countryId }, { countryId: null }] } as Prisma.WebsiteWhereInput] : []),
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
      select: { id: true, name: true, url: true, da: true, pa: true, spamScore: true, traffic: true, type: true, description: true, tagSlugs: true },
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
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true },
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
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true },
    }),
  ]);

  // Fallback: if too few website results, drop keywords but keep country + category hard filters
  let candidateSites = rawWebsites;
  if (candidateSites.length < 10) {
    candidateSites = await db.website.findMany({
      where: { AND: websiteBaseConditions },
      orderBy: [{ isPinned: "desc" }, { da: "desc" }],
      take: 150,
      select: { id: true, name: true, url: true, da: true, pa: true, spamScore: true, traffic: true, type: true, description: true, tagSlugs: true },
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
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true },
    });
  }
  // Last resort: if still empty, return top influencers globally (let AI judge relevance)
  if (candidateInfluencers.length === 0) {
    candidateInfluencers = await db.influencer.findMany({
      where: { isActive: true },
      orderBy: { followersCount: "desc" },
      take: 40,
      select: { id: true, name: true, platform: true, followersCount: true, categorySlugs: true, tagSlugs: true, description: true, profileLink: true },
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
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true },
    });
  }
  if (candidateFunds.length === 0) {
    candidateFunds = await db.fund.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 25,
      select: { id: true, name: true, websiteUrl: true, investmentStage: true, ticketSize: true, categorySlugs: true, tagSlugs: true, description: true },
    });
  }

  // ─── Step 3b: Feedback loop ────────────────────────────────────────────────
  // Look up how many times each candidate has been marked complete (userStatus="saved")
  // by past users. Entities with more completions get a pre-score boost since they've
  // been proven relevant in real curations.
  const [websiteCompletions, influencerCompletions, redditCompletions, fundCompletions] =
    await Promise.all([
      db.curationResult.groupBy({
        by: ["websiteId"],
        where: { websiteId: { in: candidateSites.map((w) => w.id) }, userStatus: "saved" },
        _count: { id: true },
      }),
      db.curationResult.groupBy({
        by: ["influencerId"],
        where: { influencerId: { in: candidateInfluencers.map((i) => i.id) }, userStatus: "saved" },
        _count: { id: true },
      }),
      db.curationResult.groupBy({
        by: ["redditChannelId"],
        where: { redditChannelId: { in: candidateReddit.map((r) => r.id) }, userStatus: "saved" },
        _count: { id: true },
      }),
      db.curationResult.groupBy({
        by: ["fundId"],
        where: { fundId: { in: candidateFunds.map((f) => f.id) }, userStatus: "saved" },
        _count: { id: true },
      }),
    ]);

  const wCompMap = new Map(websiteCompletions.map((c) => [c.websiteId!, c._count.id]));
  const iCompMap = new Map(influencerCompletions.map((c) => [c.influencerId!, c._count.id]));
  const rCompMap = new Map(redditCompletions.map((c) => [c.redditChannelId!, c._count.id]));
  const fCompMap = new Map(fundCompletions.map((c) => [c.fundId!, c._count.id]));

  // ─── Step 3c: Pre-score + sort candidates ─────────────────────────────────
  // Sort each pool by relevance score so the AI always sees the best candidates
  // first (important when we truncate to fit token limits).
  const scoredSites = candidateSites
    .map((w) => ({
      ...w,
      _s: scoreCandidateRelevance(w, keywordsLower, categorySlugs, wCompMap.get(w.id) ?? 0, Math.min((w.da / 100) * 2, 2)),
    }))
    .sort((a, b) => b._s - a._s);

  const scoredInfluencers = candidateInfluencers
    .map((inf) => ({
      ...inf,
      _s: scoreCandidateRelevance(inf, keywordsLower, categorySlugs, iCompMap.get(inf.id) ?? 0, Math.min((inf.followersCount / 1_000_000) * 2, 2)),
    }))
    .sort((a, b) => b._s - a._s);

  const scoredReddit = candidateReddit
    .map((r) => ({
      ...r,
      _s: scoreCandidateRelevance(r, keywordsLower, categorySlugs, rCompMap.get(r.id) ?? 0, Math.min((r.totalMembers / 1_000_000) * 2, 2)),
    }))
    .sort((a, b) => b._s - a._s);

  const scoredFunds = candidateFunds
    .map((f) => ({
      ...f,
      _s: scoreCandidateRelevance(f, keywordsLower, categorySlugs, fCompMap.get(f.id) ?? 0, 0),
    }))
    .sort((a, b) => b._s - a._s);

  // Strip internal score field and cap pool sizes before sending to AI
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const finalSites = scoredSites.slice(0, 80).map(({ _s, ...rest }) => rest);
  const finalInfluencers = scoredInfluencers.slice(0, 40).map(({ _s, ...rest }) => rest);
  const finalReddit = scoredReddit.slice(0, 40).map(({ _s, ...rest }) => rest);
  const finalFunds = scoredFunds.slice(0, 25).map(({ _s, ...rest }) => rest);
  /* eslint-enable @typescript-eslint/no-unused-vars */

  // ─── Step 4: AI matching ───────────────────────────────────────────────────
  await setProgress(curationId, "calling_ai");

  const matchResults = await rankAllCandidatesForCuration(
    {
      productUrl,
      keywords: keywordsLower,
      description: description ?? "",
      countryName: country?.name,
      categoryName: category?.name,
    },
    {
      websites: finalSites,
      influencers: finalInfluencers,
      redditChannels: finalReddit,
      funds: finalFunds,
    }
  );

  // ─── Step 5: Save results ──────────────────────────────────────────────────
  await setProgress(curationId, "saving_results");

  if (matchResults.length > 0) {
    await db.curationResult.createMany({
      data: matchResults.map((r) => ({
        curationId,
        websiteId: r.websiteId ?? null,
        influencerId: r.influencerId ?? null,
        redditChannelId: r.redditChannelId ?? null,
        fundId: r.fundId ?? null,
        matchScore: r.matchScore,
        matchReason: r.matchReason,
        section: r.section,
        rank: r.rank,
      })),
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
        message: `Your curation for ${productUrl} is ready with ${matchResults.length} results.`,
      },
    });
  }

  await setProgress(curationId, "complete");
}
