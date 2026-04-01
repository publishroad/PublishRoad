export const revalidate = 0;

import { db } from "@/lib/db";
import Link from "next/link";
import { AppHeader } from "@/components/dashboard/AppHeader";

interface SearchParams { q?: string; platform?: string; page?: string; }
const PAGE_SIZE = 25;

const platformStyle: Record<string, string> = {
  tiktok: "bg-gray-900 text-white",
  instagram: "bg-pink-50 text-pink-700",
  youtube: "bg-red-50 text-red-700",
  twitter: "bg-sky-50 text-sky-700",
};

const platformLabel: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter (X)",
};

export default async function AdminSocialPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const allowedPlatforms = new Set(["tiktok", "instagram", "youtube", "twitter"]);
  const platform = params.platform && allowedPlatforms.has(params.platform) ? params.platform : undefined;

  const where = {
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
    ...(platform ? { platform: platform as "tiktok" | "instagram" | "youtube" | "twitter" } : {}),
  };

  const [influencers, total] = await Promise.all([
    db.influencer.findMany({
      where,
      include: {
        influencerCategories: { include: { category: { select: { name: true } } } },
        country: { select: { name: true } },
      },
      orderBy: [{ isActive: "desc" }, { followersCount: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.influencer.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  type InfluencerRow = (typeof influencers)[number];

  return (
    <>
      <AppHeader
        title={`Social Influencers (${total.toLocaleString()})`}
        rightSlot={
          <Link
            href="/admin/social/new"
            className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Influencer
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
              name="platform"
              defaultValue={platform}
              className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]"
            >
              <option value="">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="twitter">Twitter (X)</option>
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
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Platform</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Followers</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Country</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {influencers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No influencers found.</td>
                  </tr>
                ) : influencers.map((inf: InfluencerRow) => (
                  <tr key={inf.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{inf.name}</p>
                      <a href={inf.profileLink} target="_blank" rel="noopener noreferrer" className="text-xs text-[#465FFF] hover:underline truncate max-w-[200px] block">{inf.profileLink}</a>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platformStyle[inf.platform] ?? "bg-gray-100 text-gray-600"}`}>
                        {platformLabel[inf.platform] ?? inf.platform}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{inf.followersCount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {inf.influencerCategories.length > 0
                        ? inf.influencerCategories.map((ic) => ic.category.name).join(", ")
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{inf.country?.name ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inf.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {inf.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/social/${inf.id}`} className="text-xs font-medium text-[#465FFF] hover:underline">Edit →</Link>
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
                  href={`/admin/social?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(platform ? { platform } : {}), page: String(page - 1) })}`}
                  className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center transition-colors"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/social?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(platform ? { platform } : {}), page: String(page + 1) })}`}
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
