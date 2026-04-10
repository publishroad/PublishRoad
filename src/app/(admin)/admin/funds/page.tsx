export const revalidate = 0;

import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/dashboard/AppHeader";

interface SearchParams { q?: string; page?: string; }
const PAGE_SIZE = 25;

const stageLabel: Record<string, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  growth: "Growth",
  late_stage: "Late Stage",
};

export default async function AdminFundsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = params.q
    ? { name: { contains: params.q, mode: "insensitive" as const } }
    : {};

  const [funds, total] = await Promise.all([
    db.fund.findMany({
      where,
      include: {
        fundCategories: { include: { category: { select: { name: true } } } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.fund.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  type FundRow = (typeof funds)[number];

  return (
    <>
      <AppHeader
        title={`Funds / Investors (${total.toLocaleString()})`}
        rightSlot={
          <div className="flex gap-2">
            <a
              href="/samples/funds-bulk-upload-template.csv"
              download
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" /></svg>
              Sample Excel
            </a>
            <Link
              href="/admin/funds/new"
              className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Fund
            </Link>
          </div>
        }
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <form className="flex gap-3 flex-wrap">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search by name..."
              className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Logo</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {funds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No funds found.</td>
                  </tr>
                ) : funds.map((fund: FundRow) => (
                  <tr key={fund.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      {fund.logoUrl ? (
                        <div className="relative w-10 h-10 rounded-lg border border-gray-100 overflow-hidden bg-gray-50">
                          <Image src={fund.logoUrl} alt={fund.name} fill sizes="40px" className="object-contain p-0.5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-300 text-xs">—</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{fund.name}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {fund.fundCategories.length > 0
                        ? fund.fundCategories.map((fc) => fc.category.name).join(", ")
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {fund.investmentStage ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {stageLabel[fund.investmentStage] ?? fund.investmentStage}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <a href={fund.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#465FFF] hover:underline truncate max-w-[180px] block">{fund.websiteUrl}</a>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fund.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {fund.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/funds/${fund.id}`} className="text-xs font-medium text-[#465FFF] hover:underline">Edit →</Link>
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
                <Link
                  href={`/admin/funds?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), page: String(page - 1) })}`}
                  className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center transition-colors"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/funds?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), page: String(page + 1) })}`}
                  className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium flex items-center transition-colors"
                >
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
