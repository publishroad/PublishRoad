"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { StatCard } from "@/components/admin/financials/StatCard";
import { TypeBadge, StatusBadge } from "@/components/admin/financials/Badges";
import { UserAvatar } from "@/components/admin/financials/UserAvatar";
import { exportFinancialsCsv } from "@/lib/admin/export-financials-csv";

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentType = "plan" | "hire_us";
type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

type Transaction = {
  id: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  paymentType: PaymentType;
  planName: string;
  planSlug: string | null;
  amountCents: number;
  amountFormatted: string;
  currency: string;
  status: PaymentStatus;
  provider: string;
};

type ChartPoint = { month: string; planRevenue: number; hireUsRevenue: number };

type ApiResponse = {
  stats: {
    totalRevenue: number;
    planRevenue: number;
    hireUsRevenue: number;
    totalCount: number;
    planCount: number;
    hireUsCount: number;
    totalRevenueFormatted: string;
    planRevenueFormatted: string;
    hireUsRevenueFormatted: string;
  };
  chart: ChartPoint[];
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ─── Date range quick-picks ───────────────────────────────────────────────────

type DateRange = { from: string; to: string } | null;

const DATE_PILLS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
  { label: "All", days: null },
] as const;

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function FinancialsDashboard() {
  const router = useRouter();

  const [activePill, setActivePill] = useState<string>("All");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [chartGrouping, setChartGrouping] = useState<"month" | "year">("month");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "20");
    if (typeFilter !== "all") p.set("type", typeFilter);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (providerFilter !== "all") p.set("provider", providerFilter);
    if (chartGrouping !== "month") p.set("chartGrouping", chartGrouping);
    if (search) p.set("search", search);
    if (dateRange?.from) p.set("from", dateRange.from);
    if (dateRange?.to) p.set("to", dateRange.to);
    return p.toString();
  }, [page, typeFilter, statusFilter, providerFilter, chartGrouping, search, dateRange]);

  const { data, isLoading, isError, error } = useQuery<ApiResponse>({
    queryKey: ["admin-financials", page, typeFilter, statusFilter, providerFilter, chartGrouping, search, dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/financials?${buildParams()}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to fetch financials");
      }
      return res.json() as Promise<ApiResponse>;
    },
    staleTime: 30_000,
  });

  function handlePill(pill: (typeof DATE_PILLS)[number]) {
    setActivePill(pill.label);
    setPage(1);
    if (pill.days === null) {
      setDateRange(null);
    } else {
      setDateRange({ from: daysAgo(pill.days), to: today() });
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const stats = data?.stats;
  const statCards = [
    {
      label: "Total Revenue",
      value: stats?.totalRevenueFormatted ?? "—",
      sub: `${stats?.totalCount ?? 0} transactions`,
      icon: "💰",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Credit Plan Revenue",
      value: stats?.planRevenueFormatted ?? "—",
      sub: `${stats?.planCount ?? 0} purchases`,
      icon: "📦",
      iconBg: "bg-[#EEF2FF]",
      iconColor: "text-[#465FFF]",
    },
    {
      label: "Hire Us Revenue",
      value: stats?.hireUsRevenueFormatted ?? "—",
      sub: `${stats?.hireUsCount ?? 0} purchases`,
      icon: "🤝",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "All Transactions",
      value: stats ? stats.totalCount.toLocaleString() : "—",
      sub: "All time",
      icon: "📊",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Stat Cards */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load financials data. {error instanceof Error ? error.message : "Please refresh and try again."}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Date pills */}
          <div className="flex gap-1.5 flex-wrap">
            {DATE_PILLS.map((pill) => (
              <button
                key={pill.label}
                onClick={() => handlePill(pill)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePill === pill.label
                    ? "bg-[#465FFF] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
            >
              <option value="all">All Types</option>
              <option value="plan">Credit Plans</option>
              <option value="hire_us">Hire Us</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Provider */}
            <select
              value={providerFilter}
              onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
            >
              <option value="all">All Providers</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="razorpay">Razorpay</option>
            </select>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by email or name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 w-56"
              />
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3a50d9] transition-colors"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                  className="h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Revenue Over Time</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {chartGrouping === "year" ? "Last 5 years" : "Last 12 months"} — Credit Plans vs Hire Us
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setChartGrouping("month")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                chartGrouping === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setChartGrouping("year")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                chartGrouping === "year" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#465FFF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <RevenueChart data={data?.chart ?? []} />
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Transactions</h2>
            {data && (
              <p className="text-xs text-gray-400 mt-0.5">
                {data.total} result{data.total !== 1 ? "s" : ""}
                {search ? ` for "${search}"` : ""}
              </p>
            )}
          </div>
          {data && data.transactions.length > 0 && (
            <button
              onClick={() => exportFinancialsCsv(data.transactions)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#465FFF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.transactions.length ? (
          <div className="py-20 text-center text-sm text-gray-400">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Date", "User", "Type", "Package", "Amount", "Provider", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/users/${t.user.id}`)}
                  >
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={t.user.name} email={t.user.email} />
                        <div className="min-w-0">
                          <p className="text-gray-900 font-medium truncate max-w-[160px]">
                            {t.user.name ?? t.user.email}
                          </p>
                          {t.user.name && (
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">{t.user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <TypeBadge type={t.paymentType} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{t.planName}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                      {t.amountFormatted}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{t.provider}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
