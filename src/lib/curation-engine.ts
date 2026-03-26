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
// Pre-scoring: rank candidates by relevance before sending to AI.
// Scoring signals (higher = more relevant):
//   +3 per keyword that exactly matches a tagSlug
//   +1.5 per keyword found in entity description or name
//   +2 per category slug match
//   +0.5 per meaningful word from product description found in entity description
//     (capped at +4 total — description overlap signal)
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
  qualityBonus: number,
  productDescWords: string[] = []
): number {
  let score = 0;
  const descLower = (entity.description ?? "").toLowerCase();
  const nameLower = entity.name.toLowerCase();

  // Keyword signals
  for (const kw of expandedKeywords) {
    if (entity.tagSlugs.includes(kw)) score += 3;
    else if (descLower.includes(kw) || nameLower.includes(kw)) score += 1.5;
  }

  // Category match
  if (entity.categorySlugs && targetCategorySlugs.length > 0) {
    const hits = targetCategorySlugs.filter((cs) => entity.categorySlugs!.includes(cs)).length;
    score += hits * 2;
  }

  // Description overlap: product description words matched against entity tags and description
  //   +2 per desc word that matches an entity tagSlug (strong signal — tags are curated)
  //   +0.5 per desc word found in entity description text (weaker — free text)
  // Both capped together at +6 so a long description can't overwhelm other signals
  if (productDescWords.length > 0) {
    let descScore = 0;
    for (const w of productDescWords) {
      if (entity.tagSlugs.includes(w)) descScore += 2;
      else if (descLower.includes(w)) descScore += 0.5;
    }
    score += Math.min(descScore, 6);
  }

  // Cap feedback bonus at 5 so a heavily-completed entity doesn't dominate
  score += Math.min(completionCount * 0.5, 5);
  score += qualityBonus;

  return score;
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

  // Extract meaningful words from product description for description-overlap scoring
  const productDescWords = extractDescWords(description ?? "");

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

  const wCompMap = new Map(
    websiteCompletions
      .filter((c): c is typeof c & { websiteId: string } => c.websiteId != null)
      .map((c) => [c.websiteId, c._count.id])
  );
  const iCompMap = new Map(
    influencerCompletions
      .filter((c): c is typeof c & { influencerId: string } => c.influencerId != null)
      .map((c) => [c.influencerId, c._count.id])
  );
  const rCompMap = new Map(
    redditCompletions
      .filter((c): c is typeof c & { redditChannelId: string } => c.redditChannelId != null)
      .map((c) => [c.redditChannelId, c._count.id])
  );
  const fCompMap = new Map(
    fundCompletions
      .filter((c): c is typeof c & { fundId: string } => c.fundId != null)
      .map((c) => [c.fundId, c._count.id])
  );

  // ─── Step 3c: Pre-score + sort candidates ─────────────────────────────────
  // Sort each pool by relevance score so the AI always sees the best candidates
  // first (important when we truncate to fit token limits).
  const scoredSites = candidateSites
    .map((w) => ({
      ...w,
      _s: scoreCandidateRelevance(w, keywordsLower, categorySlugs, wCompMap.get(w.id) ?? 0, Math.min((w.da / 100) * 2, 2), productDescWords),
    }))
    .sort((a, b) => b._s - a._s);

  const scoredInfluencers = candidateInfluencers
    .map((inf) => ({
      ...inf,
      _s: scoreCandidateRelevance(inf, keywordsLower, categorySlugs, iCompMap.get(inf.id) ?? 0, Math.min((inf.followersCount / 1_000_000) * 2, 2), productDescWords),
    }))
    .sort((a, b) => b._s - a._s);

  const scoredReddit = candidateReddit
    .map((r) => ({
      ...r,
      _s: scoreCandidateRelevance(r, keywordsLower, categorySlugs, rCompMap.get(r.id) ?? 0, Math.min((r.totalMembers / 1_000_000) * 2, 2), productDescWords),
    }))
    .sort((a, b) => b._s - a._s);

  const scoredFunds = candidateFunds
    .map((f) => ({
      ...f,
      _s: scoreCandidateRelevance(f, keywordsLower, categorySlugs, fCompMap.get(f.id) ?? 0, 0, productDescWords),
    }))
    .sort((a, b) => b._s - a._s);

  // Strip _s and cap pool size for AI (websites only)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const finalSites = scoredSites.slice(0, 80).map(({ _s, ...rest }) => rest);

  // ─── Step 4: AI matching ───────────────────────────────────────────────────
  await setProgress(curationId, "calling_ai");

  // ─── AI ranks websites only (sections A/B/C) ─────────────────────────────
  // Sections D/E/F are ranked directly by pre-score below.
  // Category + country are already guaranteed by DB hard filters, so every
  // candidate in finalInfluencers/finalReddit/finalFunds is already relevant.
  const websiteResults = await rankWebsitesForCuration(
    {
      productUrl,
      keywords: keywordsLower,
      description: description ?? "",
      countryName: country?.name,
      categoryName: category?.name,
    },
    finalSites
  );

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
    matchScore: Math.min(0.5 + inf._s * 0.05, 1),
    matchReason: `${inf.platform} · ${(inf.followersCount / 1000).toFixed(0)}K followers · ${inf.categorySlugs.join(", ")}`,
    section: "d" as const,
    rank: idx + 1,
  }));

  const redditResults = scoredReddit.slice(0, MAX_PER_SECTION).map((r, idx) => ({
    redditChannelId: r.id,
    matchScore: Math.min(0.5 + r._s * 0.05, 1),
    matchReason: `${(r.totalMembers / 1000).toFixed(0)}K members · ${r.postingDifficulty ?? "N/A"} to post · ${r.categorySlugs.join(", ")}`,
    section: "e" as const,
    rank: idx + 1,
  }));

  const fundResults = scoredFunds.slice(0, MAX_PER_SECTION).map((f, idx) => ({
    fundId: f.id,
    matchScore: Math.min(0.5 + f._s * 0.05, 1),
    matchReason: `${f.investmentStage ?? "Any"} stage · ${f.ticketSize ?? "N/A"} · ${f.categorySlugs.join(", ")}`,
    section: "f" as const,
    rank: idx + 1,
  }));

  const allResults = [...websiteResults, ...influencerResults, ...redditResults, ...fundResults];

  // ─── Step 5: Save results ──────────────────────────────────────────────────
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
