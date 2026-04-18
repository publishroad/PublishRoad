import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

const MAX_FEATURES = 10;
const MAX_FEATURE_LENGTH = 160;

function sanitizeFeatures(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;

  const deduped = new Set<string>();
  const normalized: string[] = [];

  for (const raw of input) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.length > MAX_FEATURE_LENGTH) return null;
    if (deduped.has(trimmed)) continue;
    deduped.add(trimmed);
    normalized.push(trimmed);
    if (normalized.length > MAX_FEATURES) return null;
  }

  return normalized;
}


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const existingPlan = await db.planConfig.findUnique({
    where: { id },
    select: { priceCents: true, compareAtPriceCents: true },
  });

  if (!existingPlan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Explicit allowlist of updatable fields
  const updateData: Record<string, unknown> = {};
  const nextPriceCents = body.priceCents !== undefined ? Number(body.priceCents) : undefined;
  const nextCompareAtPriceCents = body.compareAtPriceCents !== undefined && body.compareAtPriceCents !== null
    ? Number(body.compareAtPriceCents)
    : body.compareAtPriceCents === null
      ? null
      : undefined;

  if (body.name !== undefined) updateData.name = body.name;
  if (body.priceCents !== undefined) updateData.priceCents = nextPriceCents;
  if (body.compareAtPriceCents !== undefined) {
    updateData.compareAtPriceCents = nextCompareAtPriceCents;
  }
  if (body.credits !== undefined) updateData.credits = Number(body.credits);
  if (body.billingType !== undefined) updateData.billingType = body.billingType;
  if (body.stripePriceId !== undefined) updateData.stripePriceId = body.stripePriceId;
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
  if (body.isVisible !== undefined) updateData.isVisible = Boolean(body.isVisible);
  if (body.features !== undefined) {
    const features = sanitizeFeatures(body.features);
    if (features === null) {
      return NextResponse.json(
        {
          error: `Features must be an array of up to ${MAX_FEATURES} non-empty strings (${MAX_FEATURE_LENGTH} chars max each).`,
        },
        { status: 422 }
      );
    }
    updateData.features = features;
  }

  if (nextPriceCents !== undefined && (!Number.isInteger(nextPriceCents) || nextPriceCents < 0)) {
    return NextResponse.json({ error: "Price must be a non-negative integer (cents)." }, { status: 422 });
  }

  if (
    nextCompareAtPriceCents !== undefined &&
    nextCompareAtPriceCents !== null &&
    (!Number.isInteger(nextCompareAtPriceCents) || nextCompareAtPriceCents < 0)
  ) {
    return NextResponse.json({ error: "Actual/List price must be a non-negative integer (cents)." }, { status: 422 });
  }

  const effectivePriceCents = nextPriceCents ?? existingPlan.priceCents;
  const effectiveCompareAtPriceCents =
    nextCompareAtPriceCents !== undefined
      ? nextCompareAtPriceCents
      : existingPlan.compareAtPriceCents;

  if (
    effectiveCompareAtPriceCents !== null &&
    effectiveCompareAtPriceCents < effectivePriceCents
  ) {
    return NextResponse.json(
      { error: "Actual/List price must be greater than or equal to offer price." },
      { status: 422 }
    );
  }

  await db.planConfig.update({ where: { id }, data: updateData });

  // Trigger ISR revalidation of pricing page
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
      body: JSON.stringify({ path: "/pricing" }),
    });
  } catch {
    // Non-fatal — revalidation failure shouldn't fail the update
  }

  return NextResponse.json({ success: true });
}
