import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedWithLock } from "@/lib/cache";
import { redis } from "@/lib/redis";
import { applyPlanResultMasking } from "@/lib/curation-mask-policy";

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
    0,
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

  // Determine masking based on plan
  const planSlug = session.user.planSlug ?? "free";
  const { results, maskedCount, lockedSections } = applyPlanResultMasking(data.results, planSlug);

  const categoryCounts = new Map<string, number>();
  for (const result of data.results) {
    const categoryName = result.website?.category?.name;
    if (!categoryName) continue;
    categoryCounts.set(categoryName, (categoryCounts.get(categoryName) ?? 0) + 1);
  }

  const categoryName =
    [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return NextResponse.json({
    id: data.id,
    productUrl: data.productUrl,
    status: data.status,
    countryName: data.country?.name ?? null,
    categoryName,
    keywords: data.keywords,
    description: data.description,
    results,
    maskedCount,
    lockedSections,
    planSlug,
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
    select: { id: true },
  });

  if (!curation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.curation.delete({ where: { id } });

  // Best-effort cache invalidation for curation detail cache.
  await redis.del(`curation:${id}:data`);

  return NextResponse.json({ success: true });
}
