export const revalidate = 0;

import Link from "next/link";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { db } from "@/lib/db";
import { formatPayoutDateUtc, getNextPayoutDateUtc, isPayoutDayUtc } from "@/lib/referrals/payout-schedule";

interface SearchParams {
  q?: string;
  page?: string;
}

const PAGE_SIZE = 25;

type ReferralRow = {
  userId: string;
  referralCode: string;
  paypalEmail: string | null;
  starterCommissionPct: number;
  hireUsCommissionPct: number;
  enrolledAt: Date | null;
  isActive: boolean;
  isDisabledByAdmin: boolean;
  createdAt: Date;
  name: string | null;
  email: string;
  signupCount: number;
  paidCount: number;
  earningsCents: bigint | number;
  hasUnpaidCommissions: boolean;
};

type SummaryRow = {
  affiliateCount: number;
  signupCount: number;
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

export default async function AdminReferralsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const query = (params.q ?? "").trim().toLowerCase();
  const like = `%${query}%`;

  const [rows, totalRows, summaryRows] = await Promise.all([
    db.$queryRaw<ReferralRow[]>`
      SELECT
        ap.user_id AS "userId",
        ap.referral_code AS "referralCode",
        ap.paypal_email AS "paypalEmail",
        ap.starter_commission_pct AS "starterCommissionPct",
        ap.hire_us_commission_pct AS "hireUsCommissionPct",
        ap.enrolled_at AS "enrolledAt",
        ap.is_active AS "isActive",
        ap.is_disabled_by_admin AS "isDisabledByAdmin",
        ap.created_at AS "createdAt",
        u.name,
        u.email,
        (
          SELECT COUNT(*)::int
          FROM affiliate_referrals ar
          WHERE ar.referrer_user_id = ap.user_id
        ) AS "signupCount",
        (
          SELECT COUNT(DISTINCT ac.referred_user_id)::int
          FROM affiliate_commissions ac
          WHERE ac.affiliate_user_id = ap.user_id
            AND ac.status <> 'reversed'
        ) AS "paidCount",
        (
          SELECT COALESCE(SUM(ac.amount_cents), 0)::bigint
          FROM affiliate_commissions ac
          WHERE ac.affiliate_user_id = ap.user_id
            AND ac.status <> 'reversed'
        ) AS "earningsCents",
        EXISTS (
          SELECT 1
          FROM affiliate_commissions ac
          WHERE ac.affiliate_user_id = ap.user_id
            AND ac.paid_at IS NULL
            AND ac.status IN ('pending', 'eligible')
        ) AS "hasUnpaidCommissions"
      FROM affiliate_profiles ap
      JOIN users u ON u.id = ap.user_id
      WHERE u.deleted_at IS NULL
        AND (
          ${query} = ''
          OR LOWER(COALESCE(u.name, '')) LIKE ${like}
          OR LOWER(u.email) LIKE ${like}
          OR LOWER(ap.referral_code) LIKE ${like}
        )
      ORDER BY ap.created_at DESC
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `,
    db.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM affiliate_profiles ap
      JOIN users u ON u.id = ap.user_id
      WHERE u.deleted_at IS NULL
        AND (
          ${query} = ''
          OR LOWER(COALESCE(u.name, '')) LIKE ${like}
          OR LOWER(u.email) LIKE ${like}
          OR LOWER(ap.referral_code) LIKE ${like}
        )
    `,
    db.$queryRaw<SummaryRow[]>`
      SELECT
        (SELECT COUNT(*)::int FROM affiliate_profiles) AS "affiliateCount",
        (SELECT COUNT(*)::int FROM affiliate_referrals) AS "signupCount",
        (
          SELECT COUNT(DISTINCT ac.referred_user_id)::int
          FROM affiliate_commissions ac
          WHERE ac.status <> 'reversed'
        ) AS "paidCount",
        (
          SELECT COALESCE(SUM(ac.amount_cents), 0)::bigint
          FROM affiliate_commissions ac
          WHERE ac.status <> 'reversed'
        ) AS "earningsCents"
    `,
  ]);

  const total = totalRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = summaryRows[0] ?? {
    affiliateCount: 0,
    signupCount: 0,
    paidCount: 0,
    earningsCents: 0,
  };

  const paginationQuery = (targetPage: number) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    qs.set("page", String(targetPage));
    return qs.toString();
  };

  return (
    <>
      <AppHeader title="Referral Program" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-end gap-2">
          <Link href="/admin/referrals/history" className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
            Payment History
          </Link>
          <Link href="/admin/referrals/active" className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
            Referral Payments
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Affiliates</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.affiliateCount.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Referred Signups</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.signupCount.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Paid Conversions</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.paidCount.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated Commission</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{formatUsdFromCents(Number(summary.earningsCents ?? 0))}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
          <form className="flex flex-wrap gap-3">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search affiliate by name, email, or referral code"
              className="h-9 min-w-[280px] flex-1 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
            />
            <button type="submit" className="h-9 rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white hover:bg-[#3d55e8]">
              Search
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Affiliate</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Signups</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paid</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Earned</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Commission</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">PayPal</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Next Payment</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-sm text-gray-400">No referral affiliates found.</td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{row.name ?? "-"}</p>
                      <p className="text-xs text-gray-400">{row.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-700">{row.referralCode}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{row.signupCount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{row.paidCount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{formatUsdFromCents(Number(row.earningsCents ?? 0))}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-medium text-[#465FFF]">Starter {row.starterCommissionPct}%</span>
                        <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">Hire Us {row.hireUsCommissionPct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {row.isDisabledByAdmin ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">Disabled</span>
                      ) : row.isActive ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Active</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{row.paypalEmail ?? "-"}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-700">{formatNextPaymentDate(row.hasUnpaidCommissions)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/referrals/${row.userId}`} className="text-xs font-medium text-[#465FFF] hover:underline">Manage →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/referrals?${paginationQuery(page - 1)}`} className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/referrals?${paginationQuery(page + 1)}`} className="h-9 rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white hover:bg-[#3d55e8] flex items-center">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
