export const revalidate = 0;

import { randomUUID } from "crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { formatPayoutDateUtc, getNextPayoutDateUtc, isPayoutDayUtc } from "@/lib/referrals/payout-schedule";

type SearchParams = {
  status?: string;
  q?: string;
  saved?: string;
  error?: string;
};

type ReferralPaymentRow = {
  userId: string;
  name: string | null;
  email: string;
  referralCode: string;
  paypalEmail: string | null;
  pendingCents: bigint | number;
  eligibleCents: bigint | number;
  paidCents: bigint | number;
  lastPaidAt: Date | null;
};

type SummaryRow = {
  pendingCents: bigint | number;
  eligibleCents: bigint | number;
  paidCents: bigint | number;
};

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}


async function markAffiliatePayoutDone(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  if (!session?.totpVerified) {
    redirect("/admin/login");
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const payoutMethod = String(formData.get("payoutMethod") ?? "").trim().toLowerCase();
  const payoutReference = String(formData.get("payoutReference") ?? "").trim();
  const adminNoteRaw = String(formData.get("adminNote") ?? "").trim();
  const paidAtRaw = String(formData.get("paidAt") ?? "").trim();

  if (!userId || !payoutMethod || !payoutReference) {
    redirect("/admin/referrals/active?error=missing_fields");
  }

  if (!isPayoutDayUtc()) {
    redirect("/admin/referrals/active?error=outside_payout_day");
  }

  const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    redirect("/admin/referrals/active?error=invalid_date");
  }

  await db.$transaction(async (tx) => {
    const eligibleRows = await tx.$queryRaw<Array<{ id: string; amountCents: bigint | number }>>`
      SELECT id, amount_cents AS "amountCents"
      FROM affiliate_commissions
      WHERE affiliate_user_id = ${userId}
        AND paid_at IS NULL
        AND (
          status = 'eligible'
          OR (status = 'pending' AND eligible_at <= NOW())
        )
      FOR UPDATE
    `;

    if (eligibleRows.length === 0) {
      redirect("/admin/referrals/active?error=no_eligible");
    }

    const totalAmountCents = eligibleRows.reduce((sum, row) => sum + Number(row.amountCents ?? 0), 0);
    const payoutBatchId = randomUUID();

    await tx.$executeRaw`
      INSERT INTO affiliate_payout_batches (
        id,
        affiliate_user_id,
        total_amount_cents,
        commission_count,
        payout_method,
        payout_reference,
        admin_note,
        paid_at,
        created_by_admin_id,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${payoutBatchId},
        ${userId},
        ${totalAmountCents},
        ${eligibleRows.length},
        ${payoutMethod},
        ${payoutReference},
        ${adminNoteRaw || null},
        ${paidAt},
        ${session.adminId},
        'paid',
        NOW(),
        NOW()
      )
    `;

    await tx.$executeRaw`
      UPDATE affiliate_commissions
      SET
        status = 'paid',
        paid_at = ${paidAt},
        payout_method = ${payoutMethod},
        payout_reference = ${payoutReference},
        admin_note = ${adminNoteRaw || null},
        payout_batch_id = ${payoutBatchId},
        marked_by_admin_id = ${session.adminId},
        updated_at = NOW()
      WHERE affiliate_user_id = ${userId}
        AND paid_at IS NULL
        AND (
          status = 'eligible'
          OR (status = 'pending' AND eligible_at <= NOW())
        )
    `;
  });

  redirect("/admin/referrals/active?saved=1");
}

export default async function AdminReferralPaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const status = params.status ?? "all";
  const query = (params.q ?? "").trim().toLowerCase();
  const like = `%${query}%`;
  const payoutDayOpen = isPayoutDayUtc();
  const nextPayoutDate = getNextPayoutDateUtc();

  const [summaryRows, payoutRows] = await Promise.all([
    db.$queryRaw<SummaryRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN ac.status = 'pending' AND ac.paid_at IS NULL AND ac.eligible_at > NOW() THEN ac.amount_cents ELSE 0 END), 0)::bigint AS "pendingCents",
        COALESCE(SUM(CASE WHEN ac.paid_at IS NULL AND (ac.status = 'eligible' OR (ac.status = 'pending' AND ac.eligible_at <= NOW())) THEN ac.amount_cents ELSE 0 END), 0)::bigint AS "eligibleCents",
        COALESCE(SUM(CASE WHEN ac.status = 'paid' THEN ac.amount_cents ELSE 0 END), 0)::bigint AS "paidCents"
      FROM affiliate_commissions ac
    `,
    db.$queryRaw<ReferralPaymentRow[]>`
      WITH grouped AS (
        SELECT
          ap.user_id AS "userId",
          u.name,
          u.email,
          ap.referral_code AS "referralCode",
          ap.paypal_email AS "paypalEmail",
          COALESCE(SUM(CASE WHEN ac.status = 'pending' AND ac.paid_at IS NULL AND ac.eligible_at > NOW() THEN ac.amount_cents ELSE 0 END), 0)::bigint AS "pendingCents",
          COALESCE(SUM(CASE WHEN ac.paid_at IS NULL AND (ac.status = 'eligible' OR (ac.status = 'pending' AND ac.eligible_at <= NOW())) THEN ac.amount_cents ELSE 0 END), 0)::bigint AS "eligibleCents",
          COALESCE(SUM(CASE WHEN ac.status = 'paid' THEN ac.amount_cents ELSE 0 END), 0)::bigint AS "paidCents",
          MAX(ac.paid_at) AS "lastPaidAt"
        FROM affiliate_profiles ap
        JOIN users u ON u.id = ap.user_id
        LEFT JOIN affiliate_commissions ac ON ac.affiliate_user_id = ap.user_id
        WHERE u.deleted_at IS NULL
          AND (
            ${query} = ''
            OR LOWER(COALESCE(u.name, '')) LIKE ${like}
            OR LOWER(u.email) LIKE ${like}
            OR LOWER(ap.referral_code) LIKE ${like}
          )
        GROUP BY ap.user_id, u.name, u.email, ap.referral_code, ap.paypal_email
      )
      SELECT *
      FROM grouped
      WHERE
        (
          ${status} = 'pending' AND "pendingCents" > 0
        )
        OR (
          ${status} = 'eligible' AND "eligibleCents" > 0
        )
        OR (
          ${status} = 'paid' AND "paidCents" > 0
        )
        OR (
          ${status} = 'all' AND ("pendingCents" > 0 OR "eligibleCents" > 0 OR "paidCents" > 0)
        )
      ORDER BY "eligibleCents" DESC, "pendingCents" DESC, "lastPaidAt" DESC NULLS LAST
      LIMIT 200
    `,
  ]);

  const summary = summaryRows[0] ?? {
    pendingCents: 0,
    eligibleCents: 0,
    paidCents: 0,
  };

  return (
    <>
      <AppHeader
        title="Referral Payments"
        rightSlot={
          <div className="flex items-center gap-2">
            <Link href="/admin/referrals/history" className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
              Payment History
            </Link>
            <Link href="/admin/referrals" className="h-9 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center">
              Back to Referrals
            </Link>
          </div>
        }
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="rounded-2xl border border-[#dbe2ff] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#465FFF]">Payout Rule</p>
          <p className="mt-2 text-sm text-slate-600">
            Commissions stay on hold for 15 days after the referred payment. Payout processing is only done on the 15th and 30th each month (UTC).
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {payoutDayOpen
              ? "Payout day is open today."
              : `Next payout day: ${formatPayoutDateUtc(nextPayoutDate)} (UTC).`}
          </p>
        </div>

        {(() => {
          const totalPendingCents = Number(summary.pendingCents ?? 0) + Number(summary.eligibleCents ?? 0);

          return (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Pending</p>
                <p className="mt-2 text-3xl font-semibold text-amber-700">{formatUsdFromCents(totalPendingCents)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payable Now</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-700">{formatUsdFromCents(Number(summary.eligibleCents ?? 0))}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Paid</p>
                <p className="mt-2 text-3xl font-semibold text-[#465FFF]">{formatUsdFromCents(Number(summary.paidCents ?? 0))}</p>
              </div>
            </div>
          );
        })()}

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 space-y-3">
          <form className="flex flex-wrap gap-3">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search by affiliate name, email, or code"
              className="h-9 min-w-[280px] flex-1 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="eligible">Eligible</option>
              <option value="paid">Paid</option>
            </select>
            <button type="submit" className="h-9 rounded-xl bg-[#465FFF] px-4 text-sm font-medium text-white hover:bg-[#3d55e8]">
              Filter
            </button>
          </form>
          {params.saved === "1" && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Payout marked as paid successfully.</p>
          )}
          {params.error === "missing_fields" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Payout method and reference are required.</p>
          )}
          {params.error === "invalid_date" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Paid date is invalid.</p>
          )}
          {params.error === "no_eligible" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">No eligible commissions were found for that affiliate.</p>
          )}
          {params.error === "outside_payout_day" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Payouts can only be marked paid on the 15th or 30th (UTC).</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Affiliate</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">PayPal</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pending</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Eligible</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paid</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mark Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payoutRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-gray-400">No affiliates match the selected payment filter.</td>
                  </tr>
                ) : payoutRows.map((row) => {
                  const holdCents = Number(row.pendingCents ?? 0);
                  const eligibleCents = Number(row.eligibleCents ?? 0);
                  const totalPendingCents = holdCents + eligibleCents;
                  const canMarkPaid = payoutDayOpen && eligibleCents > 0;

                  return (
                    <tr key={row.userId}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{row.name ?? "-"}</p>
                        <p className="text-xs text-gray-400">{row.email}</p>
                        <p className="mt-1 text-xs text-gray-500">Code: {row.referralCode}</p>
                        {row.lastPaidAt && (
                          <p className="mt-1 text-xs text-gray-500">Last paid: {new Date(row.lastPaidAt).toLocaleString()}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{row.paypalEmail ?? "-"}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-amber-700">
                        {formatUsdFromCents(totalPendingCents)}
                        <p className="mt-1 text-[11px] font-normal text-slate-500">Hold: {formatUsdFromCents(holdCents)}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-emerald-700">{formatUsdFromCents(eligibleCents)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-[#465FFF]">{formatUsdFromCents(Number(row.paidCents ?? 0))}</td>
                      <td className="px-5 py-4">
                        <form action={markAffiliatePayoutDone} className="space-y-2">
                          <input type="hidden" name="userId" value={row.userId} />
                          <input
                            type="datetime-local"
                            name="paidAt"
                            className="h-8 w-full rounded-lg border border-gray-200 px-2 text-xs text-gray-700 focus:border-[#465FFF] focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <select
                              name="payoutMethod"
                              defaultValue="paypal"
                              className="h-8 min-w-[110px] rounded-lg border border-gray-200 px-2 text-xs text-gray-700 focus:border-[#465FFF] focus:outline-none"
                            >
                              <option value="paypal">PayPal</option>
                              <option value="bank">Bank</option>
                              <option value="wise">Wise</option>
                              <option value="other">Other</option>
                            </select>
                            <input
                              name="payoutReference"
                              placeholder="Reference ID"
                              className="h-8 flex-1 rounded-lg border border-gray-200 px-2 text-xs text-gray-700 focus:border-[#465FFF] focus:outline-none"
                            />
                          </div>
                          <input
                            name="adminNote"
                            placeholder="Optional note"
                            className="h-8 w-full rounded-lg border border-gray-200 px-2 text-xs text-gray-700 focus:border-[#465FFF] focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!canMarkPaid}
                            className={canMarkPaid
                              ? "h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
                              : "h-8 rounded-lg bg-gray-200 px-3 text-xs font-medium text-gray-500"
                            }
                          >
                            {canMarkPaid
                              ? `Mark ${formatUsdFromCents(eligibleCents)} Paid`
                              : payoutDayOpen
                              ? "No eligible amount"
                              : "Payout opens on 15th/30th"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
