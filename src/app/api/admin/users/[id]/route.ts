import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateUserProfile } from "@/lib/cache";
import { generateCreatorInviteToken } from "@/lib/content-creators/invite";

function isMissingCreatorTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("content_creator_profiles") || message.includes("content_creator_referrals") || message.includes("42p01");
}


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

  const contentCreatorEnabled =
    body.contentCreatorEnabled !== undefined ? Boolean(body.contentCreatorEnabled) : undefined;
  const contentCreatorMaxInvites =
    body.contentCreatorMaxInvites !== undefined ? Number(body.contentCreatorMaxInvites) : undefined;
  const contentCreatorExpiresAt =
    body.contentCreatorExpiresAt !== undefined
      ? body.contentCreatorExpiresAt
        ? new Date(String(body.contentCreatorExpiresAt))
        : null
      : undefined;
  const contentCreatorDisabledReason =
    body.contentCreatorDisabledReason !== undefined
      ? String(body.contentCreatorDisabledReason || "").trim() || null
      : undefined;
  const regenerateCreatorToken = body.regenerateCreatorToken === true;

  const hasCreatorUpdate =
    contentCreatorEnabled !== undefined ||
    contentCreatorMaxInvites !== undefined ||
    contentCreatorExpiresAt !== undefined ||
    contentCreatorDisabledReason !== undefined ||
    regenerateCreatorToken;

  if (
    (starterCommissionPct !== undefined && (!Number.isFinite(starterCommissionPct) || starterCommissionPct < 0 || starterCommissionPct > 100)) ||
    (hireUsCommissionPct !== undefined && (!Number.isFinite(hireUsCommissionPct) || hireUsCommissionPct < 0 || hireUsCommissionPct > 100))
  ) {
    return NextResponse.json({ error: "Commission percentage must be between 0 and 100" }, { status: 422 });
  }

  if (referralPaypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referralPaypalEmail)) {
    return NextResponse.json({ error: "Invalid PayPal email" }, { status: 422 });
  }

  if (
    contentCreatorMaxInvites !== undefined &&
    (!Number.isFinite(contentCreatorMaxInvites) || contentCreatorMaxInvites < 0)
  ) {
    return NextResponse.json({ error: "Max invites must be 0 or greater" }, { status: 422 });
  }

  if (
    contentCreatorExpiresAt !== undefined &&
    contentCreatorExpiresAt !== null &&
    Number.isNaN(contentCreatorExpiresAt.getTime())
  ) {
    return NextResponse.json({ error: "Invalid creator expiry date" }, { status: 422 });
  }

  if (Object.keys(updateData).length > 0) {
    await db.user.update({ where: { id }, data: updateData });
  }

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

  let creatorInviteToken: string | null = null;

  if (hasCreatorUpdate) {
    let creatorRows: Array<{
      isEnabled: boolean;
      maxInvites: number;
      usedInvites: number;
      inviteToken: string;
      expiresAt: Date | null;
      disabledAt: Date | null;
      disabledReason: string | null;
    }> = [];

    try {
      creatorRows = await db.$queryRaw<Array<{
        isEnabled: boolean;
        maxInvites: number;
        usedInvites: number;
        inviteToken: string;
        expiresAt: Date | null;
        disabledAt: Date | null;
        disabledReason: string | null;
      }>>`
        SELECT
          is_enabled AS "isEnabled",
          max_invites AS "maxInvites",
          used_invites AS "usedInvites",
          invite_token AS "inviteToken",
          expires_at AS "expiresAt",
          disabled_at AS "disabledAt",
          disabled_reason AS "disabledReason"
        FROM content_creator_profiles
        WHERE user_id = ${id}
        LIMIT 1
      `;
    } catch (error) {
      if (isMissingCreatorTableError(error)) {
        return NextResponse.json(
          { error: "Creator invite tables are missing. Run migrations and try again." },
          { status: 503 }
        );
      }
      throw error;
    }

    const existingCreator = creatorRows[0];
    const nextEnabled = contentCreatorEnabled ?? existingCreator?.isEnabled ?? false;
    const nextMaxInvites = contentCreatorMaxInvites ?? existingCreator?.maxInvites ?? 0;
    const nextUsedInvites = existingCreator?.usedInvites ?? 0;
    const nextInviteToken =
      regenerateCreatorToken || !existingCreator?.inviteToken
        ? generateCreatorInviteToken()
        : existingCreator.inviteToken;
    const nextExpiresAt =
      contentCreatorExpiresAt !== undefined ? contentCreatorExpiresAt : existingCreator?.expiresAt ?? null;
    const nextDisabledReason =
      contentCreatorDisabledReason !== undefined
        ? contentCreatorDisabledReason
        : existingCreator?.disabledReason ?? null;
    const nextDisabledAt = nextEnabled ? null : existingCreator?.disabledAt ?? new Date();

    if (!existingCreator) {
      await db.$executeRaw`
        INSERT INTO content_creator_profiles (
          user_id,
          is_enabled,
          max_invites,
          used_invites,
          invite_token,
          expires_at,
          disabled_at,
          disabled_reason,
          created_at,
          updated_at
        )
        VALUES (
          ${id},
          ${nextEnabled},
          ${nextMaxInvites},
          0,
          ${nextInviteToken},
          ${nextExpiresAt},
          ${nextDisabledAt},
          ${nextDisabledReason},
          NOW(),
          NOW()
        )
      `;
      creatorInviteToken = nextInviteToken;
    } else {
      await db.$executeRaw`
        UPDATE content_creator_profiles
        SET
          is_enabled = ${nextEnabled},
          max_invites = ${nextMaxInvites},
          used_invites = ${nextUsedInvites},
          invite_token = ${nextInviteToken},
          expires_at = ${nextExpiresAt},
          disabled_at = ${nextDisabledAt},
          disabled_reason = ${nextDisabledReason},
          updated_at = NOW()
        WHERE user_id = ${id}
      `;
      creatorInviteToken = nextInviteToken;
    }
  }

  await invalidateUserProfile(id);

  return NextResponse.json({ success: true, creatorInviteToken });
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
