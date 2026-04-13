import { randomUUID, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const CREATOR_INVITE_COOKIE = "pr_creator_invite_token";

export type CreatorInviteStatus =
  | "valid"
  | "invalid"
  | "disabled"
  | "expired"
  | "limit_reached"
  | "new_signup_only"
  | "already_claimed"
  | "pro_plan_missing";

export type InviteStatusResult = {
  status: CreatorInviteStatus;
  creatorUserId?: string;
  maxInvites?: number;
  usedInvites?: number;
  expiresAt?: Date | null;
};

export type ClaimInviteResult = {
  claimed: boolean;
  status: CreatorInviteStatus;
  creatorUserId?: string;
};

export function generateCreatorInviteToken(): string {
  return randomUUID();
}

export function normalizeInviteToken(rawToken: string | null | undefined): string {
  return (rawToken ?? "").trim().toLowerCase();
}

function isMissingCreatorTableError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2010") {
    return false;
  }

  const message = String(error.message ?? "").toLowerCase();
  return message.includes("content_creator_profiles") || message.includes("content_creator_referrals") || message.includes("42p01");
}

function mapInviteRowToStatus(row: {
  userId: string;
  isEnabled: boolean;
  maxInvites: number;
  usedInvites: number;
  expiresAt: Date | null;
} | null): InviteStatusResult {
  if (!row) {
    return { status: "invalid" };
  }

  if (!row.isEnabled) {
    return { status: "disabled", creatorUserId: row.userId, maxInvites: row.maxInvites, usedInvites: row.usedInvites, expiresAt: row.expiresAt };
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return { status: "expired", creatorUserId: row.userId, maxInvites: row.maxInvites, usedInvites: row.usedInvites, expiresAt: row.expiresAt };
  }

  if (row.usedInvites >= row.maxInvites) {
    return { status: "limit_reached", creatorUserId: row.userId, maxInvites: row.maxInvites, usedInvites: row.usedInvites, expiresAt: row.expiresAt };
  }

  return {
    status: "valid",
    creatorUserId: row.userId,
    maxInvites: row.maxInvites,
    usedInvites: row.usedInvites,
    expiresAt: row.expiresAt,
  };
}

export async function getCreatorInviteStatus(
  inviteToken: string,
  tx?: Prisma.TransactionClient
): Promise<InviteStatusResult> {
  const normalizedToken = normalizeInviteToken(inviteToken);
  if (!normalizedToken) {
    return { status: "invalid" };
  }

  const executor = tx ?? db;
  let rows: Array<{
    userId: string;
    isEnabled: boolean;
    maxInvites: number;
    usedInvites: number;
    expiresAt: Date | null;
  }> = [];

  try {
    rows = await executor.$queryRaw<Array<{
      userId: string;
      isEnabled: boolean;
      maxInvites: number;
      usedInvites: number;
      expiresAt: Date | null;
    }>>`
      SELECT
        user_id AS "userId",
        is_enabled AS "isEnabled",
        max_invites AS "maxInvites",
        used_invites AS "usedInvites",
        expires_at AS "expiresAt"
      FROM content_creator_profiles
      WHERE invite_token = ${normalizedToken}
      LIMIT 1
    `;
  } catch (error) {
    if (isMissingCreatorTableError(error)) {
      return { status: "pro_plan_missing" };
    }
    throw error;
  }

  return mapInviteRowToStatus(rows[0] ?? null);
}

async function claimCreatorInviteInTx(
  tx: Prisma.TransactionClient,
  referredUserId: string,
  inviteToken: string
): Promise<ClaimInviteResult> {
  const normalizedToken = normalizeInviteToken(inviteToken);
  if (!normalizedToken || !referredUserId) {
    return { claimed: false, status: "invalid" };
  }

  const inviteRows = await tx.$queryRaw<Array<{
    userId: string;
    isEnabled: boolean;
    maxInvites: number;
    usedInvites: number;
    expiresAt: Date | null;
  }>>`
    SELECT
      user_id AS "userId",
      is_enabled AS "isEnabled",
      max_invites AS "maxInvites",
      used_invites AS "usedInvites",
      expires_at AS "expiresAt"
    FROM content_creator_profiles
    WHERE invite_token = ${normalizedToken}
    FOR UPDATE
  `;

  const status = mapInviteRowToStatus(inviteRows[0] ?? null);
  if (status.status !== "valid" || !status.creatorUserId) {
    return { claimed: false, status: status.status };
  }

  if (status.creatorUserId === referredUserId) {
    return { claimed: false, status: "invalid" };
  }

  const existingReferralRows = await tx.$queryRaw<Array<{ exists: number }>>`
    SELECT 1::int AS "exists"
    FROM content_creator_referrals
    WHERE referred_user_id = ${referredUserId}
    LIMIT 1
  `;

  if (existingReferralRows[0]?.exists) {
    return { claimed: false, status: "already_claimed", creatorUserId: status.creatorUserId };
  }

  const proPlanRows = await tx.$queryRaw<Array<{ id: string; credits: number }>>`
    SELECT id, credits
    FROM plan_configs
    WHERE slug = 'pro'
      AND is_active = true
    ORDER BY sort_order ASC
    LIMIT 1
  `;

  const proPlan = proPlanRows[0];
  if (!proPlan) {
    return { claimed: false, status: "pro_plan_missing", creatorUserId: status.creatorUserId };
  }

  const insertRows = await tx.$queryRaw<Array<{ inserted: number }>>`
    WITH inserted AS (
      INSERT INTO content_creator_referrals (
        id,
        creator_user_id,
        referred_user_id,
        invite_token,
        accepted_at
      )
      VALUES (
        ${randomBytes(16).toString("hex")},
        ${status.creatorUserId},
        ${referredUserId},
        ${normalizedToken},
        NOW()
      )
      ON CONFLICT (referred_user_id) DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*)::int AS inserted
    FROM inserted
  `;

  if ((insertRows[0]?.inserted ?? 0) !== 1) {
    return { claimed: false, status: "already_claimed", creatorUserId: status.creatorUserId };
  }

  const updatedProfileRows = await tx.$queryRaw<Array<{ updated: number }>>`
    WITH updated AS (
      UPDATE content_creator_profiles
      SET
        used_invites = used_invites + 1,
        updated_at = NOW()
      WHERE user_id = ${status.creatorUserId}
        AND is_enabled = true
        AND used_invites < max_invites
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING user_id
    )
    SELECT COUNT(*)::int AS updated
    FROM updated
  `;

  if ((updatedProfileRows[0]?.updated ?? 0) !== 1) {
    return { claimed: false, status: "limit_reached", creatorUserId: status.creatorUserId };
  }

  await tx.$executeRaw`
    UPDATE users
    SET
      plan_id = ${proPlan.id},
      credits_remaining = ${proPlan.credits},
      referred_by_creator_id = ${status.creatorUserId}
    WHERE id = ${referredUserId}
  `;

  return { claimed: true, status: "valid", creatorUserId: status.creatorUserId };
}

export async function claimCreatorInviteForUser(args: {
  referredUserId: string;
  inviteToken: string;
  tx?: Prisma.TransactionClient;
}): Promise<ClaimInviteResult> {
  if (args.tx) {
    try {
      return claimCreatorInviteInTx(args.tx, args.referredUserId, args.inviteToken);
    } catch (error) {
      if (isMissingCreatorTableError(error)) {
        return { claimed: false, status: "pro_plan_missing" };
      }
      throw error;
    }
  }

  try {
    return await db.$transaction(
      async (tx) => claimCreatorInviteInTx(tx, args.referredUserId, args.inviteToken),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isMissingCreatorTableError(error)) {
      return { claimed: false, status: "pro_plan_missing" };
    }
    throw error;
  }
}

export function mapInviteStatusToQuery(status: CreatorInviteStatus): string {
  switch (status) {
    case "disabled":
      return "invite_disabled";
    case "expired":
      return "invite_expired";
    case "limit_reached":
      return "invite_limit";
    case "new_signup_only":
      return "invite_new_signup_only";
    case "already_claimed":
      return "invite_already_claimed";
    case "pro_plan_missing":
      return "invite_unavailable";
    case "invalid":
    default:
      return "invite_invalid";
  }
}
