// Cache curation list for 60 seconds — admin view, changes are infrequent
export const revalidate = 0;

import { db } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";

interface SearchParams { status?: string; page?: string; }
const PAGE_SIZE = 25;

const statusStyle: Record<string, string> = {
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  processing: "bg-blue-50 text-blue-700",
  pending: "bg-orange-50 text-orange-700",
};

function completionStyle(percent: number): string {
  if (percent >= 80) return "bg-green-50 text-green-700";
  if (percent >= 40) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default async function AdminCurationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const skip = (page - 1) * PAGE_SIZE;
  const where = params.status ? { status: params.status as "pending" | "processing" | "completed" | "failed" } : {};

  const [curations, total] = await Promise.all([
    db.curation.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        results: { select: { userStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.curation.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  type CurationRow = (typeof curations)[number];

  return (
    <>
      <AppHeader title={`Curations (${total.toLocaleString()})`} />
      <div className="flex-1 p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <form className="flex gap-3">
            <select name="status" defaultValue={params.status} className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <button type="submit" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors">Filter</button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product URL</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Results</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {curations.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No curations found.</td></tr>
                ) : curations.map((c: CurationRow) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      <Link href={`/admin/users/${c.user.id}`} className="text-[#465FFF] hover:text-[#3647D6] hover:underline">
                        {c.user.name ?? c.user.email}
                      </Link>
                    </td>
                    <td className="px-5 py-4 max-w-[220px]">
                      <p className="text-xs text-[#465FFF] truncate">{c.productUrl}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle[c.status] ?? "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{c.results.length}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {(() => {
                        const completed = c.results.filter((r) => r.userStatus === "saved").length;
                        const totalResults = c.results.length;
                        const percent = totalResults === 0 ? 0 : Math.round((completed / totalResults) * 100);
                        return (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${completionStyle(percent)}`}>
                            {percent}% ({completed}/{totalResults})
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(c.createdAt)}</td>
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
              {page > 1 && <Link href={`/admin/curations?page=${page - 1}${params.status ? `&status=${params.status}` : ""}`} className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center transition-colors">Previous</Link>}
              {page < totalPages && <Link href={`/admin/curations?page=${page + 1}${params.status ? `&status=${params.status}` : ""}`} className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium flex items-center transition-colors">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
