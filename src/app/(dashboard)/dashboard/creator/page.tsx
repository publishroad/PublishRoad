export const revalidate = 0;

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";

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
      LIMIT 25
    `;
  } catch (error) {
    if (isMissingCreatorTableError(error)) {
      return [];
    }
    throw error;
  }
}

export default async function CreatorAccessPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/creator");
  }

  const userId = session.user.id;

  const profileRows = await getCreatorProfileRows(userId);
  const profile = profileRows[0] ?? null;
  const isAccessEnabled = !!profile?.isEnabled;
  const referralRows = isAccessEnabled ? await getCreatorReferralRows(userId) : [];
  const inviteLink = profile ? `${getSiteUrl()}/invite/${encodeURIComponent(profile.inviteToken)}` : null;
  const remainingInvites = profile ? Math.max(0, profile.maxInvites - profile.usedInvites) : 0;
  const isExpired = !!profile?.expiresAt && new Date(profile.expiresAt).getTime() <= Date.now();
  const isLimitReached = !!profile && profile.usedInvites >= profile.maxInvites;

  const status = isExpired
    ? "expired"
    : isLimitReached
    ? "limit-reached"
    : "active";

  const statusLabel =
    status === "active"
      ? "Active"
      : status === "limit-reached"
      ? "Limit Reached"
      : "Expired";

  const statusClass =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "limit-reached"
      ? "bg-amber-50 text-amber-700"
      : "bg-orange-50 text-orange-700";

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] min-h-screen">
      <AppHeader title="Creator Invite Access" />

      <div className="p-6 max-w-5xl w-full mx-auto space-y-6">
        {!profile || !isAccessEnabled ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Creator access is not enabled</h2>
            <p className="text-sm text-gray-600">
              Ask an admin to enable Content Creator access on your account to get an invite link.
            </p>
            {profile?.disabledReason && (
              <p className="text-xs text-red-700 mt-3">Disabled reason: {profile.disabledReason}</p>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Your Invite Link</h2>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Share this link. New users who sign up with it get free Pro access while invites remain.
              </p>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 break-all">
                {inviteLink}
              </div>
              {profile.expiresAt && (
                <p className="text-xs text-amber-700">Expires on {new Date(profile.expiresAt).toLocaleDateString()}</p>
              )}
              {status === "limit-reached" && (
                <p className="text-xs text-amber-700">Invite limit has been reached. Ask admin to increase max invites.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Invites</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{profile.maxInvites}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Used Invites</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{profile.usedInvites}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Remaining</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{remainingInvites}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Referred Users</h3>
              {referralRows.length === 0 ? (
                <p className="text-sm text-gray-600">No referrals yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2">Accepted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralRows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="py-2 pr-4 text-gray-900">{row.name ?? "-"}</td>
                          <td className="py-2 pr-4 text-gray-700">{row.email}</td>
                          <td className="py-2 text-gray-700">{new Date(row.acceptedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
