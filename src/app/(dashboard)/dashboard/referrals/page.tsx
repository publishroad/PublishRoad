export const revalidate = 0;

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPayoutDateUtc, getNextPayoutDateUtc, isPayoutDayUtc } from "@/lib/referrals/payout-schedule";
import { getSiteUrl } from "@/lib/seo";

type SearchParams = {
  saved?: string;
  error?: string;
  enroll?: string;
  activated?: string;
  referralsPage?: string;
  payoutsPage?: string;
};

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
};

type ReferralSummaryRow = {
  signupCount: number;
};

type ReferralRevenueRow = {
  paidCount: number;
  earningsCents: bigint | number;
};

type RecentReferralRow = {
  id: string;
  createdAt: Date;
  name: string | null;
  email: string;
};

type PayoutSummaryRow = {
  pendingCents: bigint | number;
  eligibleCents: bigint | number;
  paidCents: bigint | number;
};

type PayoutHistoryRow = {
  paidAt: Date;
  amountCents: bigint | number;
  payoutMethod: string | null;
  payoutReference: string | null;
  adminNote: string | null;
};

const PAGE_SIZE = 10;

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function buildReferralCode() {
  return `PR-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

const MARKETING_CHANNEL_OPTIONS = [
  "youtube",
  "linkedin",
  "twitter",
  "reddit",
  "facebook",
  "instagram",
  "friend_or_colleague",
  "blog_or_article",
  "other",
] as const;

function getChannelLabel(channel: string) {
  return channel
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function ensureAffiliateProfile(userId: string): Promise<AffiliateProfileRow> {
  const existing = await db.$queryRaw<AffiliateProfileRow[]>`
    SELECT
      user_id AS "userId",
      referral_code AS "referralCode",
      paypal_email AS "paypalEmail",
      starter_commission_pct AS "starterCommissionPct",
      hire_us_commission_pct AS "hireUsCommissionPct",
      enrolled_at AS "enrolledAt",
      is_active AS "isActive",
      is_disabled_by_admin AS "isDisabledByAdmin",
      marketing_channel AS "marketingChannel",
      terms_accepted_at AS "termsAcceptedAt"
    FROM affiliate_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (existing[0]) {
    return existing[0];
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = buildReferralCode();

    try {
      const created = await db.$queryRaw<AffiliateProfileRow[]>`
        INSERT INTO affiliate_profiles (
          user_id,
          referral_code,
          starter_commission_pct,
          hire_us_commission_pct
        )
        VALUES (${userId}, ${referralCode}, 25, 15)
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
            terms_accepted_at AS "termsAcceptedAt"
      `;

      if (created[0]) {
        return created[0];
      }
    } catch (error) {
      const dbCode =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";

      if (dbCode !== "23505") {
        throw error;
      }
    }
  }

  throw new Error("Failed to generate unique referral code");
}

async function savePayoutDetails(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/referrals");
  }

  const paypalEmailRaw = String(formData.get("paypalEmail") ?? "").trim().toLowerCase();
  const isValidEmail = !paypalEmailRaw || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmailRaw);

  if (!isValidEmail) {
    redirect("/dashboard/referrals?error=invalid_paypal");
  }

  await db.$executeRaw`
    UPDATE affiliate_profiles
    SET
      paypal_email = ${paypalEmailRaw || null},
      updated_at = NOW()
    WHERE user_id = ${session.user.id}
  `;

  redirect("/dashboard/referrals?saved=1");
}

async function activateAffiliateProgram(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/referrals");
  }

  const userId = session.user.id;
  const channel = String(formData.get("marketingChannel") ?? "").trim().toLowerCase();
  const acceptedTerms = formData.get("acceptedTerms") === "on";

  if (!MARKETING_CHANNEL_OPTIONS.includes(channel as (typeof MARKETING_CHANNEL_OPTIONS)[number])) {
    redirect("/dashboard/referrals?enroll=1&error=invalid_channel");
  }

  if (!acceptedTerms) {
    redirect("/dashboard/referrals?enroll=1&error=terms_required");
  }

  await ensureAffiliateProfile(userId);

  const currentProfile = await db.$queryRaw<Array<{ isDisabledByAdmin: boolean }>>`
    SELECT is_disabled_by_admin AS "isDisabledByAdmin"
    FROM affiliate_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  if (currentProfile[0]?.isDisabledByAdmin) {
    redirect("/dashboard/referrals?error=disabled");
  }

  await db.$executeRaw`
    UPDATE affiliate_profiles
    SET
      is_active = true,
      marketing_channel = ${channel},
      terms_accepted_at = COALESCE(terms_accepted_at, NOW()),
      enrolled_at = COALESCE(enrolled_at, NOW()),
      updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  redirect("/dashboard/referrals?activated=1");
}

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/referrals");
  }

  const params = await searchParams;
  const referralsPage = Math.max(1, parseInt(params.referralsPage ?? "1", 10) || 1);
  const payoutsPage = Math.max(1, parseInt(params.payoutsPage ?? "1", 10) || 1);
  const referralsOffset = (referralsPage - 1) * PAGE_SIZE;
  const payoutsOffset = (payoutsPage - 1) * PAGE_SIZE;
  const userId = session.user.id;

  const profile = await ensureAffiliateProfile(userId);
  const isProgramDisabled = profile.isDisabledByAdmin;
  const isProgramActive = profile.isActive && !isProgramDisabled;
  const showEnrollmentModal = !isProgramActive && !isProgramDisabled && params.enroll === "1";
  const referralLink = `${getSiteUrl()}/r/${encodeURIComponent(profile.referralCode)}`;

  const [
    signupSummary,
    revenueSummary,
    recentReferrals,
    referralCountRows,
    payoutSummaryRows,
    payoutHistoryRows,
    payoutHistoryCountRows,
  ] = await Promise.all([
    db.$queryRaw<ReferralSummaryRow[]>`
      SELECT COUNT(*)::int AS "signupCount"
      FROM affiliate_referrals
      WHERE referrer_user_id = ${userId}
    `,
    db.$queryRaw<ReferralRevenueRow[]>`
      SELECT
        COUNT(DISTINCT ac.referred_user_id)::int AS "paidCount",
        COALESCE(SUM(ac.amount_cents), 0)::bigint AS "earningsCents"
      FROM affiliate_commissions ac
      WHERE ac.affiliate_user_id = ${userId}
        AND ac.status <> 'reversed'
    `,
    db.$queryRaw<RecentReferralRow[]>`
      SELECT
        ar.id,
        ar.created_at AS "createdAt",
        u.name,
        u.email
      FROM affiliate_referrals ar
      JOIN users u ON u.id = ar.referred_user_id
      WHERE ar.referrer_user_id = ${userId}
      ORDER BY ar.created_at DESC
      LIMIT ${PAGE_SIZE}
      OFFSET ${referralsOffset}
    `,
    db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM affiliate_referrals ar
      WHERE ar.referrer_user_id = ${userId}
    `,
    db.$queryRaw<PayoutSummaryRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pending' AND paid_at IS NULL AND eligible_at > NOW() THEN amount_cents ELSE 0 END), 0)::bigint AS "pendingCents",
        COALESCE(SUM(CASE WHEN paid_at IS NULL AND (status = 'eligible' OR (status = 'pending' AND eligible_at <= NOW())) THEN amount_cents ELSE 0 END), 0)::bigint AS "eligibleCents",
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::bigint AS "paidCents"
      FROM affiliate_commissions
      WHERE affiliate_user_id = ${userId}
    `,
    db.$queryRaw<PayoutHistoryRow[]>`
      SELECT
        paid_at AS "paidAt",
        SUM(amount_cents)::bigint AS "amountCents",
        payout_method AS "payoutMethod",
        payout_reference AS "payoutReference",
        admin_note AS "adminNote"
      FROM affiliate_commissions
      WHERE affiliate_user_id = ${userId}
        AND status = 'paid'
        AND paid_at IS NOT NULL
      GROUP BY paid_at, payout_method, payout_reference, admin_note
      ORDER BY paid_at DESC
      LIMIT ${PAGE_SIZE}
      OFFSET ${payoutsOffset}
    `,
    db.$queryRaw<Array<{ count: number }>>`
      WITH payout_history AS (
        SELECT 1
        FROM affiliate_commissions
        WHERE affiliate_user_id = ${userId}
          AND status = 'paid'
          AND paid_at IS NOT NULL
        GROUP BY paid_at, payout_method, payout_reference, admin_note
      )
      SELECT COUNT(*)::int AS count
      FROM payout_history
    `,
  ]);

  const signupCount = signupSummary[0]?.signupCount ?? 0;
  const referralRowsCount = referralCountRows[0]?.count ?? 0;
  const referralTotalPages = Math.max(1, Math.ceil(referralRowsCount / PAGE_SIZE));
  const paidCount = revenueSummary[0]?.paidCount ?? 0;
  const earningsCents = Number(revenueSummary[0]?.earningsCents ?? 0);
  const payoutRowsCount = payoutHistoryCountRows[0]?.count ?? 0;
  const payoutTotalPages = Math.max(1, Math.ceil(payoutRowsCount / PAGE_SIZE));
  const payoutSummary = payoutSummaryRows[0] ?? {
    pendingCents: 0,
    eligibleCents: 0,
    paidCents: 0,
  };
  const totalPendingCents = Number(payoutSummary.pendingCents ?? 0) + Number(payoutSummary.eligibleCents ?? 0);
  const payoutDayOpen = isPayoutDayUtc();
  const nextPayoutDate = getNextPayoutDateUtc();
  const payableNowCents = payoutDayOpen ? Number(payoutSummary.eligibleCents ?? 0) : 0;

  const buildPageQuery = (changes: { referralsPage?: number; payoutsPage?: number }) => {
    const qs = new URLSearchParams();
    if (params.saved) qs.set("saved", params.saved);
    if (params.error) qs.set("error", params.error);
    if (params.enroll) qs.set("enroll", params.enroll);
    if (params.activated) qs.set("activated", params.activated);

    const nextReferralsPage = changes.referralsPage ?? referralsPage;
    const nextPayoutsPage = changes.payoutsPage ?? payoutsPage;

    if (nextReferralsPage > 1) qs.set("referralsPage", String(nextReferralsPage));
    if (nextPayoutsPage > 1) qs.set("payoutsPage", String(nextPayoutsPage));

    const query = qs.toString();
    return query ? `/dashboard/referrals?${query}` : "/dashboard/referrals";
  };

  return (
    <>
      <AppHeader title="Refer & Earn" />
      <div className="flex-1 bg-[#f8fafc]">
        <div className="mx-auto w-full max-w-[1100px] space-y-6 px-6 py-10">
          <div className="rounded-2xl border border-[#dbe2ff] bg-white p-6">
            {isProgramDisabled ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Referral Program Disabled</p>
                <p className="mt-2 text-sm text-slate-600">
                  Your referral access is currently deactivated by admin. Referral links are disabled until re-enabled.
                </p>
              </>
            ) : isProgramActive ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#465FFF]">Your Referral Link</p>
                <p className="mt-1 text-sm text-slate-500">Share this link. New users who sign up through it will be tracked in your dashboard.</p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 break-all">
                  {referralLink}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Starter commission: {profile.starterCommissionPct}%</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Hire Us commission: {profile.hireUsCommissionPct}%</span>
                  {profile.marketingChannel && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Channel: {getChannelLabel(profile.marketingChannel)}</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#465FFF]">Activate Referral Program</p>
                <p className="mt-1 text-sm text-slate-500">
                  Finish one quick enrollment step to activate your referral link.
                </p>
                {params.activated === "1" && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Referral program activated successfully.</p>
                )}
                <a
                  href="/dashboard/referrals?enroll=1"
                  className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3d55e8]"
                >
                  Activate Now
                </a>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signups</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{signupCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid Users</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{paidCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated Earnings</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{formatUsdFromCents(earningsCents)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Payout Status</h2>
            <p className="mt-1 text-sm text-slate-500">Commissions mature after a 15-day hold and are paid on the 15th and 30th (UTC).</p>
            <p className="mt-2 text-xs text-slate-500">
              {payoutDayOpen
                ? "Payout day is open today."
                : `Next payout day: ${formatPayoutDateUtc(nextPayoutDate)} (UTC).`}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Pending</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">{formatUsdFromCents(totalPendingCents)}</p>
                <p className="mt-1 text-xs text-slate-500">Hold: {formatUsdFromCents(Number(payoutSummary.pendingCents ?? 0))}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payable This Cycle</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700">{formatUsdFromCents(payableNowCents)}</p>
                {!payoutDayOpen && (
                  <p className="mt-1 text-xs text-slate-500">Will be processed on {formatPayoutDateUtc(nextPayoutDate)} (UTC).</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid</p>
                <p className="mt-2 text-2xl font-semibold text-[#465FFF]">{formatUsdFromCents(Number(payoutSummary.paidCents ?? 0))}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Referral Payout FAQ</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">When are referral payouts processed?</p>
                <p className="mt-1">Payout runs are processed on the 15th and 30th of each month (UTC).</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Why is part of my commission still on hold?</p>
                <p className="mt-1">Each commission has a 15-day hold period from the referred payment date before it can enter a payout cycle.</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">What if my commission becomes eligible after a payout day?</p>
                <p className="mt-1">It will be included in the next payout window (15th or 30th).</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Payout Details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add your PayPal email so admins can send your referral payouts.
            </p>
            {params.saved === "1" && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Payout details saved.</p>
            )}
            {params.error === "invalid_paypal" && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Please enter a valid PayPal email address.</p>
            )}
            {params.error === "invalid_channel" && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Please select a valid marketing channel.</p>
            )}
            {params.error === "terms_required" && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">You must accept the referral terms to activate.</p>
            )}
            {params.error === "disabled" && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Your referral program has been deactivated by admin.</p>
            )}
            {!isProgramActive && !isProgramDisabled && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Activate your referral program first to start earning commissions.</p>
            )}
            <form action={savePayoutDetails} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="email"
                name="paypalEmail"
                defaultValue={profile.paypalEmail ?? ""}
                placeholder="you@paypal.com"
                disabled={isProgramDisabled}
                className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
              />
              <button
                type="submit"
                disabled={isProgramDisabled}
                className="h-10 rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3d55e8]"
              >
                Save PayPal
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Recent Referred Signups</h2>
            {recentReferrals.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No referrals yet. Share your link to start earning.</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentReferrals.map((referral) => (
                        <tr key={referral.id}>
                          <td className="px-3 py-3 text-sm font-medium text-slate-900">{referral.name ?? "-"}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">{referral.email}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">{new Date(referral.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {referralTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Page {referralsPage} of {referralTotalPages}</p>
                    <div className="flex gap-2">
                      {referralsPage > 1 && (
                        <a href={buildPageQuery({ referralsPage: referralsPage - 1 })} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Previous
                        </a>
                      )}
                      {referralsPage < referralTotalPages && (
                        <a href={buildPageQuery({ referralsPage: referralsPage + 1 })} className="inline-flex h-8 items-center rounded-lg bg-[#465FFF] px-3 text-xs font-medium text-white hover:bg-[#3d55e8]">
                          Next
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Payout History</h2>
            {payoutHistoryRows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No payout history yet.</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Paid At</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Method</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payoutHistoryRows.map((row) => (
                        <tr key={`${row.paidAt.toISOString()}-${row.payoutReference ?? "-"}`}>
                          <td className="px-3 py-3 text-sm text-slate-600">{new Date(row.paidAt).toLocaleString()}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-[#465FFF]">{formatUsdFromCents(Number(row.amountCents ?? 0))}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">{row.payoutMethod ?? "-"}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">{row.payoutReference ?? "-"}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">{row.adminNote ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {payoutTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Page {payoutsPage} of {payoutTotalPages}</p>
                    <div className="flex gap-2">
                      {payoutsPage > 1 && (
                        <a href={buildPageQuery({ payoutsPage: payoutsPage - 1 })} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Previous
                        </a>
                      )}
                      {payoutsPage < payoutTotalPages && (
                        <a href={buildPageQuery({ payoutsPage: payoutsPage + 1 })} className="inline-flex h-8 items-center rounded-lg bg-[#465FFF] px-3 text-xs font-medium text-white hover:bg-[#3d55e8]">
                          Next
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {showEnrollmentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-lg font-semibold text-slate-900">Activate Referral Program</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tell us how you plan to promote PublishRoad and accept the terms to activate your referral link.
                </p>
                <form action={activateAffiliateProgram} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="marketingChannel" className="text-sm font-medium text-slate-700">Primary Marketing Channel</label>
                    <select
                      id="marketingChannel"
                      name="marketingChannel"
                      required
                      defaultValue={profile.marketingChannel ?? ""}
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
                    >
                      <option value="" disabled>Select one</option>
                      {MARKETING_CHANNEL_OPTIONS.map((option) => (
                        <option key={option} value={option}>{getChannelLabel(option)}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-600">
                    <input type="checkbox" name="acceptedTerms" required className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                    <span>I confirm that I will not use spam, fake traffic, or misleading claims when sharing referral links.</span>
                  </label>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <a href="/dashboard/referrals" className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</a>
                    <button type="submit" className="inline-flex h-10 items-center rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white hover:bg-[#3d55e8]">Activate Program</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
