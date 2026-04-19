// Cache user details for 60 seconds — admin changes are infrequent
export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { UserAdminPanel } from "@/components/admin/UserAdminPanel";
import { formatDate } from "@/lib/utils";

type AffiliateProfileRow = {
  starterCommissionPct: number;
  hireUsCommissionPct: number;
  paypalEmail: string | null;
};

type CreatorProfileRow = {
  isEnabled: boolean;
  maxInvites: number;
  usedInvites: number;
  inviteToken: string;
  expiresAt: Date | null;
  disabledReason: string | null;
};

type CreatorReferralRow = {
  id: string;
  acceptedAt: Date;
  name: string | null;
  email: string;
};

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

async function getCreatorProfileRows(userId: string): Promise<CreatorProfileRow[]> {
  try {
    return await db.$queryRaw<CreatorProfileRow[]>`
      SELECT
        is_enabled AS "isEnabled",
        max_invites AS "maxInvites",
        used_invites AS "usedInvites",
        invite_token AS "inviteToken",
        expires_at AS "expiresAt",
        disabled_reason AS "disabledReason"
      FROM content_creator_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
  } catch (error) {
    if (isMissingCreatorTableError(error)) {
      return [];
    }
    throw error;
  }
}

async function getCreatorReferralRows(userId: string): Promise<CreatorReferralRow[]> {
  try {
    return await db.$queryRaw<CreatorReferralRow[]>`
      SELECT
        ccr.id,
        ccr.accepted_at AS "acceptedAt",
        u.name,
        u.email
      FROM content_creator_referrals ccr
      JOIN users u ON u.id = ccr.referred_user_id
      WHERE ccr.creator_user_id = ${userId}
      ORDER BY ccr.accepted_at DESC
      LIMIT 10
    `;
  } catch (error) {
    if (isMissingCreatorTableError(error)) {
      return [];
    }
    throw error;
  }
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, plans, curations, hireUsPaymentCount, affiliateProfileRows, creatorProfileRows, creatorReferralRows] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        authProvider: true,
        emailVerifiedAt: true,
        planId: true,
        creditsRemaining: true,
      },
    }),
    db.planConfig.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } }),
    db.curation.count({ where: { userId: id } }),
    db.payment.count({ where: { userId: id, paymentType: "hire_us" } }),
    db.$queryRaw<AffiliateProfileRow[]>`
      SELECT
        starter_commission_pct AS "starterCommissionPct",
        hire_us_commission_pct AS "hireUsCommissionPct",
        paypal_email AS "paypalEmail"
      FROM affiliate_profiles
      WHERE user_id = ${id}
      LIMIT 1
    `,
    getCreatorProfileRows(id),
    getCreatorReferralRows(id),
  ]);

  if (!user) notFound();

  const affiliateProfile = affiliateProfileRows[0] ?? {
    starterCommissionPct: 25,
    hireUsCommissionPct: 15,
    paypalEmail: null,
  };

  const creatorProfile = creatorProfileRows[0] ?? {
    isEnabled: false,
    maxInvites: 0,
    usedInvites: 0,
    inviteToken: "",
    expiresAt: null,
    disabledReason: null,
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-border-gray px-6 py-4">
        <h1 className="text-lg font-semibold text-navy">User: {user.name ?? user.email}</h1>
        <p className="text-sm text-medium-gray">ID: {user.id}</p>
      </div>

      <div className="flex-1 p-6 max-w-3xl space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-border-gray p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-medium-gray">Email</dt>
              <dd className="font-medium text-dark-gray">{user.email}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Joined</dt>
              <dd className="font-medium text-dark-gray">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Auth Provider</dt>
              <dd className="capitalize font-medium text-dark-gray">{user.authProvider}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Curations</dt>
              <dd className="font-medium text-dark-gray">{curations}</dd>
            </div>
            <div>
              <dt className="text-medium-gray">Email Verified</dt>
              <dd className={user.emailVerifiedAt ? "text-success font-medium" : "text-error font-medium"}>
                {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
              </dd>
            </div>
          </dl>
        </div>

        <UserAdminPanel
          user={user}
          plans={plans}
          hasHireUsPurchases={hireUsPaymentCount > 0}
          hireUsPaymentCount={hireUsPaymentCount}
          affiliateProfile={affiliateProfile}
          creatorProfile={creatorProfile}
          creatorReferrals={creatorReferralRows}
        />
      </div>
    </div>
  );
}
