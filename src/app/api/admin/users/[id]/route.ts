import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateUserProfile } from "@/lib/cache";


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  // Explicit allowlist
  const updateData: Record<string, unknown> = {};
  if (body.planId !== undefined) updateData.planId = body.planId;
  if (body.creditsRemaining !== undefined) updateData.creditsRemaining = Number(body.creditsRemaining);

  const starterCommissionPct =
    body.starterCommissionPct !== undefined ? Number(body.starterCommissionPct) : undefined;
  const hireUsCommissionPct =
    body.hireUsCommissionPct !== undefined ? Number(body.hireUsCommissionPct) : undefined;
  const referralPaypalEmail =
    body.referralPaypalEmail !== undefined
      ? String(body.referralPaypalEmail || "").trim().toLowerCase() || null
      : undefined;

  const hasCommissionUpdate =
    starterCommissionPct !== undefined ||
    hireUsCommissionPct !== undefined ||
    referralPaypalEmail !== undefined;

  if (
    (starterCommissionPct !== undefined && (!Number.isFinite(starterCommissionPct) || starterCommissionPct < 0 || starterCommissionPct > 100)) ||
    (hireUsCommissionPct !== undefined && (!Number.isFinite(hireUsCommissionPct) || hireUsCommissionPct < 0 || hireUsCommissionPct > 100))
  ) {
    return NextResponse.json({ error: "Commission percentage must be between 0 and 100" }, { status: 422 });
  }

  if (referralPaypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referralPaypalEmail)) {
    return NextResponse.json({ error: "Invalid PayPal email" }, { status: 422 });
  }

  await db.user.update({ where: { id }, data: updateData });

  if (hasCommissionUpdate) {
    const referralCode = `PR-${randomBytes(6).toString("hex").toUpperCase()}`;

    await db.$executeRaw`
      INSERT INTO affiliate_profiles (
        user_id,
        referral_code,
        starter_commission_pct,
        hire_us_commission_pct,
        paypal_email,
        updated_at
      )
      VALUES (
        ${id},
        ${referralCode},
        ${starterCommissionPct ?? 25},
        ${hireUsCommissionPct ?? 15},
        ${referralPaypalEmail ?? null},
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        starter_commission_pct = COALESCE(${starterCommissionPct ?? null}, affiliate_profiles.starter_commission_pct),
        hire_us_commission_pct = COALESCE(${hireUsCommissionPct ?? null}, affiliate_profiles.hire_us_commission_pct),
        paypal_email = COALESCE(${referralPaypalEmail ?? null}, affiliate_profiles.paypal_email),
        updated_at = NOW()
    `;
  }

  await invalidateUserProfile(id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Hard delete for admin-initiated account deletion
  await db.user.delete({ where: { id } });
  await invalidateUserProfile(id);

  return NextResponse.json({ success: true });
}
