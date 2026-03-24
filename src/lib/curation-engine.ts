import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { redis } from "@/lib/redis";
import { rankWebsitesForCuration } from "@/lib/ai";
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

  // ─── Step 3: Fetch candidate websites ─────────────────────────────────────
  await setProgress(curationId, "fetching_sites");

  const websites = await db.website.findMany({
    where: {
      isActive: true,
      isExcluded: false,
      ...(countryId
        ? {
            OR: [{ countryId }, { countryId: null }],
          }
        : {}),
      ...(categoryId
        ? {
            AND: [{ OR: [{ categoryId }, { categoryId: null }] }],
          }
        : {}),
      // GIN array overlap — match any keyword against tagSlugs
      ...(keywords.length > 0
        ? {
            tagSlugs: {
              hasSome: keywords.map((k) => k.toLowerCase()),
            },
          }
        : {}),
    },
    orderBy: [{ isPinned: "desc" }, { da: "desc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      url: true,
      da: true,
      type: true,
      description: true,
      tagSlugs: true,
    },
  });

  // Fallback: if too few results with keyword filter, fetch top sites globally
  let candidateSites = websites;
  if (candidateSites.length < 10) {
    candidateSites = await db.website.findMany({
      where: {
        isActive: true,
        isExcluded: false,
        ...(countryId
          ? {
              OR: [{ countryId }, { countryId: null }],
            }
          : {}),
        ...(categoryId
          ? {
              AND: [{ OR: [{ categoryId }, { categoryId: null }] }],
            }
          : {}),
      },
      orderBy: [{ isPinned: "desc" }, { da: "desc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        url: true,
        da: true,
        type: true,
        description: true,
        tagSlugs: true,
      },
    });
  }

  // ─── Step 4: AI matching ───────────────────────────────────────────────────
  await setProgress(curationId, "calling_ai");

  const [country, category] = await Promise.all([
    countryId
      ? db.country.findUnique({ where: { id: countryId }, select: { name: true } })
      : Promise.resolve(null),
    categoryId
      ? db.category.findUnique({ where: { id: categoryId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const matchResults = await rankWebsitesForCuration(
    {
      productUrl,
      keywords,
      description: description ?? "",
      countryName: country?.name,
      categoryName: category?.name,
    },
    candidateSites
  );

  // ─── Step 5: Save results ──────────────────────────────────────────────────
  await setProgress(curationId, "saving_results");

  if (matchResults.length > 0) {
    await db.curationResult.createMany({
      data: matchResults.map((r) => ({
        curationId,
        websiteId: r.websiteId,
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
        include: { website: { select: { name: true, url: true, da: true, type: true } } },
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
