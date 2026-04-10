export const revalidate = 0;

import { randomUUID } from "crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin-auth";
import { formatPayoutDateUtc, getNextPayoutDateUtc, isPayoutDayUtc } from "@/lib/referrals/payout-schedule";

type AffiliateProfileRow = {
  userId: string;
  referralCode: string;
  paypalEmail: string | null;
  starterCommissionPct: number;
  hireUsCommissionPct: number;
  enrolledAt: Date | null;
  isActive: boolean;
  isDisabledByAdmin: boolean;
  marketingChannel: string | null;
  termsAcceptedAt: Date | null;
  createdAt: Date;
  userName: string | null;
  userEmail: string;
};

type ReferralStatsRow = {
  signupCount: number;
  paidCount: number;
  earningsCents: bigint | number;
};

type NextPayoutRow = {
  hasUnpaidCommissions: boolean;
};

type ReferralUserRow = {
  referralId: string;
  referredUserId: string;
  createdAt: Date;
  referredName: string | null;
  referredEmail: string;
  paidCount: number;
  earningsCents: bigint | number;
};

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatNextPaymentDate(hasUnpaidCommissions: boolean) {
  if (!hasUnpaidCommissions) return "-";
  if (isPayoutDayUtc()) return "Today";
  return formatPayoutDateUtc(getNextPayoutDateUtc());
}

function buildReferralCode() {
  return `PR-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function getChannelLabel(channel: string | null) {
  if (!channel) return "-";
  return channel
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


async function updateAffiliateSettings(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  if (!session?.totpVerified) {
    redirect("/admin/login");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const starterCommissionPct = Number(formData.get("starterCommissionPct") ?? "");
  const hireUsCommissionPct = Number(formData.get("hireUsCommissionPct") ?? "");
  const paypalEmailRaw = String(formData.get("paypalEmail") ?? "").trim().toLowerCase();
  const paypalEmail = paypalEmailRaw || null;

  if (!userId) {
    redirect("/admin/referrals?error=invalid_user");
  }

  if (
    !Number.isFinite(starterCommissionPct) ||
    !Number.isFinite(hireUsCommissionPct) ||
    starterCommissionPct < 0 || starterCommissionPct > 100 ||
    hireUsCommissionPct < 0 || hireUsCommissionPct > 100
  ) {
    redirect(`/admin/referrals/${userId}?error=invalid_commission`);
  }

  if (paypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
    redirect(`/admin/referrals/${userId}?error=invalid_paypal`);
  }

  await db.$executeRaw`
    UPDATE affiliate_profiles
    SET
      starter_commission_pct = ${starterCommissionPct},
      hire_us_commission_pct = ${hireUsCommissionPct},
      paypal_email = ${paypalEmail},
      updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  redirect(`/admin/referrals/${userId}?saved=1`);
}

async function updateAffiliateStatus(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  if (!session?.totpVerified) {
    redirect("/admin/login");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "").trim();

  if (!userId || (nextStatus !== "activate" && nextStatus !== "deactivate")) {
    redirect("/admin/referrals?error=invalid_status");
  }

  if (nextStatus === "deactivate") {
    await db.$executeRaw`
      UPDATE affiliate_profiles
      SET
        is_active = false,
        is_disabled_by_admin = true,
        updated_at = NOW()
      WHERE user_id = ${userId}
    `;
  } else {
    await db.$executeRaw`
      UPDATE affiliate_profiles
      SET
        is_active = true,
        is_disabled_by_admin = false,
        enrolled_at = COALESCE(enrolled_at, NOW()),
        updated_at = NOW()
      WHERE user_id = ${userId}
    `;
  }

  redirect(`/admin/referrals/${userId}?saved=1`);
}

async function ensureAffiliateProfile(userId: string): Promise<AffiliateProfileRow> {
  const rows = await db.$queryRaw<AffiliateProfileRow[]>`
    SELECT
      ap.user_id AS "userId",
      ap.referral_code AS "referralCode",
      ap.paypal_email AS "paypalEmail",
      ap.starter_commission_pct AS "starterCommissionPct",
      ap.hire_us_commission_pct AS "hireUsCommissionPct",
      ap.enrolled_at AS "enrolledAt",
      ap.is_active AS "isActive",
      ap.is_disabled_by_admin AS "isDisabledByAdmin",
      ap.marketing_channel AS "marketingChannel",
      ap.terms_accepted_at AS "termsAcceptedAt",
      ap.created_at AS "createdAt",
      u.name AS "userName",
      u.email AS "userEmail"
    FROM affiliate_profiles ap
    JOIN users u ON u.id = ap.user_id
    WHERE ap.user_id = ${userId}
      AND u.deleted_at IS NULL
    LIMIT 1
  `;

  if (rows[0]) {
    return rows[0];
  }

  const userRows = await db.$queryRaw<Array<{ id: string; name: string | null; email: string }>>`
    SELECT id, name, email
    FROM users
    WHERE id = ${userId}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const user = userRows[0];
  if (!user) {
    notFound();
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const referralCode = buildReferralCode();
      const created = await db.$queryRaw<AffiliateProfileRow[]>`
        INSERT INTO affiliate_profiles (
          user_id,
          referral_code,
          starter_commission_pct,
          hire_us_commission_pct
        )
        VALUES (${user.id}, ${referralCode}, 25, 15)
        RETURNING
          user_id AS "userId",
          referral_code AS "referralCode",
          paypal_email AS "paypalEmail",
          starter_commission_pct AS "starterCommissionPct",
          hire_us_commission_pct AS "hireUsCommissionPct",
          enrolled_at AS "enrolledAt",
          is_active AS "isActive",
          is_disabled_by_admin AS "isDisabledByAdmin",
          marketing_channel AS "marketingChannel",
          terms_accepted_at AS "termsAcceptedAt",
          created_at AS "createdAt",
          ${user.name}::text AS "userName",
          ${user.email}::text AS "userEmail"
      `;

      if (created[0]) {
        return created[0];
      }
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      if (code !== "23505") {
        throw error;
      }
    }
  }

  throw new Error("Unable to create affiliate profile");
}

export default async function AdminReferralDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const profile = await ensureAffiliateProfile(id);
  const referralLink = `${getSiteUrl()}/r/${encodeURIComponent(profile.referralCode)}`;

  const [statsRows, referredUsers, nextPayoutRows] = await Promise.all([
    db.$queryRaw<ReferralStatsRow[]>`
      SELECT
        (SELECT COUNT(*)::int FROM affiliate_referrals ar WHERE ar.referrer_user_id = ${profile.userId}) AS "signupCount",
        (
          SELECT COUNT(DISTINCT ac.referred_user_id)::int
          FROM affiliate_commissions ac
          WHERE ac.affiliate_user_id = ${profile.userId}
            AND ac.status <> 'reversed'
        ) AS "paidCount",
        (
          SELECT COALESCE(SUM(ac.amount_cents), 0)::bigint
          FROM affiliate_commissions ac
          WHERE ac.affiliate_user_id = ${profile.userId}
            AND ac.status <> 'reversed'
        ) AS "earningsCents"
    `,
    db.$queryRaw<ReferralUserRow[]>`
      SELECT
        ar.id AS "referralId",
        ar.referred_user_id AS "referredUserId",
        ar.created_at AS "createdAt",
        u.name AS "referredName",
        u.email AS "referredEmail",
        COUNT(DISTINCT ac.id)::int AS "paidCount",
        COALESCE(SUM(ac.amount_cents), 0)::bigint AS "earningsCents"
      FROM affiliate_referrals ar
      JOIN users u ON u.id = ar.referred_user_id
      LEFT JOIN affiliate_commissions ac ON ac.affiliate_user_id = ${profile.userId}
        AND ac.referred_user_id = ar.referred_user_id
        AND ac.status <> 'reversed'
      WHERE ar.referrer_user_id = ${profile.userId}
      GROUP BY ar.id, ar.referred_user_id, ar.created_at, u.name, u.email
      ORDER BY ar.created_at DESC
      LIMIT 100
    `,
    db.$queryRaw<NextPayoutRow[]>`
      SELECT
        EXISTS (
          SELECT 1
          FROM affiliate_commissions ac
          WHERE ac.affiliate_user_id = ${profile.userId}
            AND ac.paid_at IS NULL
            AND ac.status IN ('pending', 'eligible')
        ) AS "hasUnpaidCommissions"
    `,
  ]);

  const stats = statsRows[0] ?? {
    signupCount: 0,
    paidCount: 0,
    earningsCents: 0,
  };

  const hasUnpaidCommissions = nextPayoutRows[0]?.hasUnpaidCommissions ?? false;

  return (
    <>
      <AppHeader
        title={`Referral Manager: ${profile.userName ?? profile.userEmail}`}
        rightSlot={
          <Link href="/admin/referrals" className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
            Back to Referrals
          </Link>
        }
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Referral Link</p>
          <p className="mt-2 break-all rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">{referralLink}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">Code: {profile.referralCode}</span>
            <span className="inline-flex rounded-full bg-[#EEF2FF] px-2.5 py-1 font-medium text-[#465FFF]">Starter {profile.starterCommissionPct}%</span>
            <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-700">Hire Us {profile.hireUsCommissionPct}%</span>
            {profile.isDisabledByAdmin ? (
              <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 font-medium text-rose-700">Disabled by admin</span>
            ) : profile.isActive ? (
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">Active</span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">Pending activation</span>
            )}
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">Channel: {getChannelLabel(profile.marketingChannel)}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Terms accepted: {profile.termsAcceptedAt ? new Date(profile.termsAcceptedAt).toLocaleString() : "No"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signups</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.signupCount.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Paid Users</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.paidCount.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated Earnings</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{formatUsdFromCents(Number(stats.earningsCents ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Next Payment Date</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{formatNextPaymentDate(hasUnpaidCommissions)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Affiliate Controls</h2>
          <p className="mt-1 text-sm text-gray-500">Update commission percentages and payout destination for this affiliate.</p>
          {query.saved === "1" && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Affiliate settings saved.</p>
          )}
          {query.error === "invalid_commission" && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Commission percentages must be between 0 and 100.</p>
          )}
          {query.error === "invalid_paypal" && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">PayPal email is invalid.</p>
          )}
          <form action={updateAffiliateSettings} className="mt-4 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="userId" value={profile.userId} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="starterCommissionPct">Starter Commission %</label>
              <input id="starterCommissionPct" name="starterCommissionPct" type="number" min={0} max={100} defaultValue={profile.starterCommissionPct} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="hireUsCommissionPct">Hire Us Commission %</label>
              <input id="hireUsCommissionPct" name="hireUsCommissionPct" type="number" min={0} max={100} defaultValue={profile.hireUsCommissionPct} className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="paypalEmail">PayPal Email</label>
              <input id="paypalEmail" name="paypalEmail" type="email" defaultValue={profile.paypalEmail ?? ""} placeholder="affiliate@paypal.com" className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="h-10 rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white hover:bg-[#3d55e8]">
                Save Referral Settings
              </button>
            </div>
          </form>

          <form action={updateAffiliateStatus} className="mt-6 border-t border-gray-100 pt-4">
            <input type="hidden" name="userId" value={profile.userId} />
            <input type="hidden" name="nextStatus" value={profile.isDisabledByAdmin ? "activate" : "deactivate"} />
            <button
              type="submit"
              className={profile.isDisabledByAdmin
                ? "h-10 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
                : "h-10 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700"
              }
            >
              {profile.isDisabledByAdmin ? "Reactivate Referral Program" : "Deactivate Referral Program"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Referred Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Joined</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paid Purchases</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {referredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center text-sm text-gray-400">No referred users found yet.</td>
                  </tr>
                ) : referredUsers.map((user) => (
                  <tr key={user.referralId}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{user.referredName ?? "-"}</p>
                      <p className="text-xs text-gray-400">{user.referredEmail}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{user.paidCount}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{formatUsdFromCents(Number(user.earningsCents ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
