export const revalidate = 60;

import { db } from "@/lib/db";
import Link from "next/link";
import { AppHeader } from "@/components/dashboard/AppHeader";

interface SearchParams { q?: string; difficulty?: string; page?: string; }
const PAGE_SIZE = 25;

const difficultyStyle: Record<string, string> = {
  easy: "bg-green-50 text-green-700",
  medium: "bg-yellow-50 text-yellow-700",
  hard: "bg-red-50 text-red-700",
};

export default async function AdminRedditChannelsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
    ...(params.difficulty ? { postingDifficulty: params.difficulty as "easy" | "medium" | "hard" } : {}),
  };

  const [channels, total] = await Promise.all([
    db.redditChannel.findMany({
      where,
      include: {
        redditChannelCategories: { include: { category: { select: { name: true } } } },
      },
      orderBy: [{ isActive: "desc" }, { totalMembers: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.redditChannel.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  type ChannelRow = (typeof channels)[number];

  return (
    <>
      <AppHeader
        title={`Reddit Channels (${total.toLocaleString()})`}
        rightSlot={
          <Link
            href="/admin/reddit-channels/new"
            className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Subreddit
          </Link>
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
            <select
              name="difficulty"
              defaultValue={params.difficulty}
              className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors"
            >
              Filter
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subreddit</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Weekly Visitors</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Difficulty</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {channels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No subreddits found.</td>
                  </tr>
                ) : channels.map((ch: ChannelRow) => (
                  <tr key={ch.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{ch.name}</p>
                      <a href={ch.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#465FFF] hover:underline">{ch.url}</a>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{(ch.totalMembers ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{(ch.weeklyVisitors ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {ch.redditChannelCategories.length > 0
                        ? ch.redditChannelCategories.map((rc) => rc.category.name).join(", ")
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {ch.postingDifficulty ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyStyle[ch.postingDifficulty] ?? "bg-gray-100 text-gray-600"}`}>
                          {ch.postingDifficulty}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ch.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {ch.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/reddit-channels/${ch.id}`} className="text-xs font-medium text-[#465FFF] hover:underline">Edit →</Link>
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
                  href={`/admin/reddit-channels?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.difficulty ? { difficulty: params.difficulty } : {}), page: String(page - 1) })}`}
                  className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center transition-colors"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/reddit-channels?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.difficulty ? { difficulty: params.difficulty } : {}), page: String(page + 1) })}`}
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
