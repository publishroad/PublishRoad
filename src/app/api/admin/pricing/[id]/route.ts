import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";

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

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  // Explicit allowlist of updatable fields
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.priceCents !== undefined) updateData.priceCents = Number(body.priceCents);
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
