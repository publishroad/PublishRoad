export const revalidate = 0;

import Link from "next/link";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { db } from "@/lib/db";

type SearchParams = {
  q?: string;
  page?: string;
};

type PaidSummaryRow = {
  totalPaidCents: bigint | number;
  paidAffiliates: bigint | number;
  totalReferralUsers: bigint | number;
  totalPayoutRows: bigint | number;
};

type PayoutHistoryRow = {
  batchId: string;
  userId: string;
  name: string | null;
  email: string;
  paidAt: Date;
  payoutMethod: string | null;
  payoutReference: string | null;
  adminNote: string | null;
  amountCents: bigint | number;
};

type CountRow = {
  count: bigint | number;
};

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function buildPageHref(page: number, q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (page > 1) params.set("page", String(page));
  return `/admin/referrals/history${params.toString() ? `?${params.toString()}` : ""}`;
}

export default async function AdminReferralPaymentHistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const like = `%${q}%`;

  const perPage = 25;
  const parsedPage = Number(params.page ?? "1");
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const offset = (currentPage - 1) * perPage;

  const [summaryRows, countRows, historyRows] = await Promise.all([
    db.$queryRaw<PaidSummaryRow[]>`
      SELECT
        COALESCE((SELECT SUM(pb.total_amount_cents)::bigint FROM affiliate_payout_batches pb WHERE pb.status = 'paid'), 0)::bigint AS "totalPaidCents",
        COALESCE((SELECT COUNT(DISTINCT pb.affiliate_user_id)::bigint FROM affiliate_payout_batches pb WHERE pb.status = 'paid'), 0)::bigint AS "paidAffiliates",
        (SELECT COUNT(*)::bigint FROM affiliate_referrals) AS "totalReferralUsers",
        COALESCE((SELECT COUNT(*)::bigint FROM affiliate_payout_batches pb WHERE pb.status = 'paid'), 0)::bigint AS "totalPayoutRows"
    `,
    db.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM affiliate_payout_batches pb
      JOIN users u ON u.id = pb.affiliate_user_id
      WHERE pb.status = 'paid'
        AND pb.paid_at IS NOT NULL
        AND (
          ${q} = ''
          OR LOWER(COALESCE(u.name, '')) LIKE ${like}
          OR LOWER(u.email) LIKE ${like}
          OR LOWER(COALESCE(pb.payout_reference, '')) LIKE ${like}
        )
    `,
    db.$queryRaw<PayoutHistoryRow[]>`
      SELECT
        pb.id AS "batchId",
        pb.affiliate_user_id AS "userId",
        u.name,
        u.email,
        pb.paid_at AS "paidAt",
        pb.payout_method AS "payoutMethod",
        pb.payout_reference AS "payoutReference",
        pb.admin_note AS "adminNote",
        pb.total_amount_cents::bigint AS "amountCents"
      FROM affiliate_payout_batches pb
      JOIN users u ON u.id = pb.affiliate_user_id
      WHERE pb.status = 'paid'
        AND pb.paid_at IS NOT NULL
        AND (
          ${q} = ''
          OR LOWER(COALESCE(u.name, '')) LIKE ${like}
          OR LOWER(u.email) LIKE ${like}
          OR LOWER(COALESCE(pb.payout_reference, '')) LIKE ${like}
        )
      ORDER BY pb.paid_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `,
  ]);

  const summary = summaryRows[0] ?? {
    totalPaidCents: 0,
    paidAffiliates: 0,
    totalReferralUsers: 0,
    totalPayoutRows: 0,
  };

  const totalRows = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  return (
    <>
      <AppHeader
        title="Payment History"
        rightSlot={
          <div className="flex items-center gap-2">
            <Link href="/admin/referrals/active" className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
              Referral Payments
            </Link>
            <Link href="/admin/referrals" className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
              Back to Referrals
            </Link>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Paid Amount</p>
            <p className="mt-2 text-3xl font-semibold text-[#465FFF]">{formatUsdFromCents(Number(summary.totalPaidCents ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Referral Users</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{Number(summary.totalReferralUsers ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Paid Affiliates</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{Number(summary.paidAffiliates ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payout Records</p>
            <p className="mt-2 text-3xl font-semibold text-amber-700">{Number(summary.totalPayoutRows ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 space-y-3">
          <form className="flex flex-wrap gap-3">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search by affiliate name, email, or payout reference"
              className="h-9 min-w-[320px] flex-1 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
            />
            <button type="submit" className="h-9 rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white hover:bg-[#3d55e8]">
              Filter
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Affiliate</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paid At</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Method</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-sm text-gray-400">No payment history found for the selected filter.</td>
                  </tr>
                ) : historyRows.map((row) => (
                  <tr key={row.batchId}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{row.name ?? "-"}</p>
                      <p className="text-xs text-gray-400">{row.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{new Date(row.paidAt).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#465FFF]">{formatUsdFromCents(Number(row.amountCents ?? 0))}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.payoutMethod ?? "-"}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.payoutReference ?? "-"}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.adminNote ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between text-sm text-gray-600">
            <p>
              Showing {historyRows.length === 0 ? 0 : offset + 1} - {offset + historyRows.length} of {totalRows.toLocaleString()} records
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref(Math.max(1, safeCurrentPage - 1), q)}
                className={safeCurrentPage > 1
                  ? "h-8 rounded-lg border border-gray-200 px-3 flex items-center hover:bg-gray-50"
                  : "h-8 rounded-lg border border-gray-100 px-3 flex items-center text-gray-300 pointer-events-none"
                }
              >
                Previous
              </Link>
              <span className="text-xs text-gray-500">Page {safeCurrentPage} of {totalPages}</span>
              <Link
                href={buildPageHref(safeCurrentPage + 1, q)}
                className={safeCurrentPage < totalPages
                  ? "h-8 rounded-lg border border-gray-200 px-3 flex items-center hover:bg-gray-50"
                  : "h-8 rounded-lg border border-gray-100 px-3 flex items-center text-gray-300 pointer-events-none"
                }
              >
                Next
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
