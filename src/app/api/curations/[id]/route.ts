import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedWithLock, invalidateUserProfile } from "@/lib/cache";
import { redis } from "@/lib/redis";
import { applyPlanResultMasking } from "@/lib/curation-mask-policy";
import { inspectWebsiteMetadata } from "@/lib/website-metadata";

type HireUsLeadCandidate = {
  id: string;
  status: string;
  serviceType: string | null;
  createdAt: Date;
  message: string | null;
  notes: string | null;
};

function findHireUsLeadForCuration(
  leads: HireUsLeadCandidate[],
  curationId: string
): HireUsLeadCandidate | null {
  const lead = leads.find((item) => {
    if (!item.notes) return false;
    try {
      const parsed = JSON.parse(item.notes) as { curationId?: unknown };
      return parsed.curationId === curationId;
    } catch {
      return false;
    }
  });

  return lead ?? null;
}

function derivePrimaryCategoryName(
  results: Array<{ website?: { category?: { name?: string | null } | null } | null }>
): string | null {
  const categoryCounts = new Map<string, number>();
  for (const result of results) {
    const categoryName = result.website?.category?.name;
    if (!categoryName) continue;
    categoryCounts.set(categoryName, (categoryCounts.get(categoryName) ?? 0) + 1);
  }

  return [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const cacheKey = `curation:${id}:data`;

  const data = await getCachedWithLock(
    cacheKey,
    // No TTL for completed curations — immutable
    null,
    async () => {
      const curation = await db.curation.findUnique({
        where: { id },
        include: {
          country: {
            select: { name: true },
          },
          results: {
            orderBy: [{ section: "asc" }, { rank: "asc" }],
            include: {
              website: {
                select: {
                  name: true,
                  url: true,
                  da: true,
                  pa: true,
                  spamScore: true,
                  traffic: true,
                  type: true,
                  category: { select: { name: true } },
                },
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
          },
        },
      });

      return curation;
    }
  );

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership check — users can only see their own curations
  if (data.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const candidateHireUsLeads = await db.serviceLead.findMany({
    where: {
      userId,
      serviceType: { in: ["hire_us_starter", "hire_us_complete"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      serviceType: true,
      createdAt: true,
      message: true,
      notes: true,
    },
    take: 20,
  });

  const hireUsLead = findHireUsLeadForCuration(candidateHireUsLeads, id);

  // Paid Hire Us curations should always be visible as full PRO results.
  const planSlug = session.user.planSlug ?? "free";
  const effectivePlanSlug = hireUsLead ? "pro" : planSlug;
  const { results, maskedCount, lockedSections } = applyPlanResultMasking(
    data.results,
    effectivePlanSlug
  );

  const categoryName = derivePrimaryCategoryName(data.results);
  const siteValidation = await inspectWebsiteMetadata(data.productUrl);

  return NextResponse.json({
    id: data.id,
    productUrl: data.productUrl,
    status: data.status,
    countryName: data.country?.name ?? null,
    categoryName,
    keywords: data.keywords,
    description: data.description,
    siteValidation,
    results,
    maskedCount,
    lockedSections,
    planSlug,
    hireUsLead: hireUsLead
      ? {
          id: hireUsLead.id,
          status: hireUsLead.status,
          packageSlug: hireUsLead.serviceType === "hire_us_complete" ? "complete" : "starter",
          createdAt: hireUsLead.createdAt,
          message: hireUsLead.message,
        }
      : null,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const curation = await db.curation.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (!curation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let refundedCredit = false;

  await db.$transaction(async (tx) => {
    const refundClaim = await tx.curation.updateMany({
      where: {
        id,
        userId,
        status: { in: ["pending", "processing"] },
      },
      data: {
        status: "failed",
        errorMessage: "Deleted by user before completion.",
      },
    });

    refundedCredit = refundClaim.count > 0;

    if (refundedCredit) {
      await tx.user.update({
        where: { id: userId },
        data: { creditsRemaining: { increment: 1 } },
      });
    }

    await tx.curation.delete({ where: { id } });
  });

  if (refundedCredit) {
    await invalidateUserProfile(userId).catch(() => {});
  }


  // Best-effort cache invalidation for curation detail/progress cache.
  await redis.del(`curation:${id}:data`);
  await redis.del(`curation:${id}:progress`);

  return NextResponse.json({ success: true, refundedCredit });
}
