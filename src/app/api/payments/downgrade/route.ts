import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateUserProfile } from "@/lib/cache";

const schema = z.object({
  targetPlanSlug: z.enum(["free", "starter", "pro", "lifetime"]),
});

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  lifetime: 3,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid downgrade payload" }, { status: 422 });
  }

  const userId = session.user.id;
  const { targetPlanSlug } = parsed.data;

  const [user, targetPlan] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        plan: {
          select: { slug: true },
        },
      },
    }),
    db.planConfig.findFirst({
      where: { slug: targetPlanSlug, isActive: true },
      select: { id: true, slug: true, credits: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!targetPlan) {
    return NextResponse.json({ error: "Target plan not found or inactive" }, { status: 404 });
  }

  const currentSlug = user.plan?.slug ?? "free";
  const currentRank = PLAN_RANK[currentSlug];
  const nextRank = PLAN_RANK[targetPlan.slug];

  if (typeof currentRank !== "number" || typeof nextRank !== "number") {
    return NextResponse.json({ error: "Plan transition not supported" }, { status: 400 });
  }

  if (nextRank > currentRank) {
    return NextResponse.json({ error: "Use checkout to upgrade plans" }, { status: 400 });
  }

  if (nextRank === currentRank) {
    return NextResponse.json({ ok: true, planSlug: targetPlan.slug });
  }

  await db.user.update({
    where: { id: userId },
    data: {
      planId: targetPlan.id,
      creditsRemaining: targetPlan.credits,
    },
  });

  await invalidateUserProfile(userId).catch(() => {});

  return NextResponse.json({ ok: true, planSlug: targetPlan.slug, creditsRemaining: targetPlan.credits });
}
