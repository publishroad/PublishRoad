// Cache website list for 60 seconds — changes are infrequent
export const revalidate = 0;

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { BulkImportModal } from "@/components/admin/BulkImportModal";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

interface SearchParams { q?: string; type?: string; category?: string; page?: string; sort?: string; order?: string; }
const PAGE_SIZE = 25;

type SortKey = "website" | "type" | "da" | "pa" | "spam" | "traffic" | "status" | "added";

const SORT_FIELD_BY_KEY: Record<SortKey, keyof Prisma.WebsiteOrderByWithRelationInput> = {
  website: "name",
  type: "type",
  da: "da",
  pa: "pa",
  spam: "spamScore",
  traffic: "traffic",
  status: "isActive",
  added: "createdAt",
};

const typeStyle: Record<string, string> = {
  distribution: "bg-[#EEF2FF] text-[#465FFF]",
  guest_post: "bg-green-50 text-green-700",
  press_release: "bg-purple-50 text-purple-700",
};

export default async function AdminWebsitesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const skip = (page - 1) * PAGE_SIZE;
  const hasValidSort = !!params.sort && Object.prototype.hasOwnProperty.call(SORT_FIELD_BY_KEY, params.sort);
  const activeSort = hasValidSort ? (params.sort as SortKey) : undefined;
  const activeOrder: Prisma.SortOrder = params.order === "desc" ? "desc" : "asc";

  const buildQueryString = (overrides: Partial<Record<"q" | "type" | "category" | "page" | "sort" | "order", string | undefined>>) => {
    const query = new URLSearchParams();

    if (params.q) query.set("q", params.q);
    if (params.type) query.set("type", params.type);
    if (params.category) query.set("category", params.category);
    if (params.page) query.set("page", params.page);
    if (activeSort) query.set("sort", activeSort);
    if (activeSort) query.set("order", activeOrder);

    Object.entries(overrides).forEach(([key, value]) => {
      if (!value) {
        query.delete(key);
        return;
      }

      query.set(key, value);
    });

    return query.toString();
  };

  const getNextSortOrder = (key: SortKey): Prisma.SortOrder => {
    if (activeSort !== key) return "asc";
    return activeOrder === "asc" ? "desc" : "asc";
  };

  const getSortHref = (key: SortKey) =>
    `/admin/websites?${buildQueryString({ sort: key, order: getNextSortOrder(key), page: "1" })}`;

  const renderSortIcon = (key: SortKey) => {
    if (activeSort !== key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />;
    }

    if (activeOrder === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 text-[#465FFF]" aria-hidden="true" />;
    }

    return <ArrowDown className="h-3.5 w-3.5 text-[#465FFF]" aria-hidden="true" />;
  };

  const orderBy: Prisma.WebsiteOrderByWithRelationInput[] = activeSort
    ? [
        { [SORT_FIELD_BY_KEY[activeSort]]: activeOrder } as Prisma.WebsiteOrderByWithRelationInput,
        { id: "asc" },
      ]
    : [{ starRating: "desc" }, { isActive: "desc" }, { da: "desc" }];

  const baseFilters: Prisma.WebsiteWhereInput[] = [
    ...(params.q
      ? [{
          OR: [
            { name: { contains: params.q, mode: "insensitive" as const } },
            { url: { contains: params.q, mode: "insensitive" as const } },
          ],
        }]
      : []),
    ...(params.type
      ? [{ type: params.type as "distribution" | "guest_post" | "press_release" }]
      : []),
  ];
  const categoryFilter: Prisma.WebsiteWhereInput[] = params.category
    ? [
        {
          OR: [
            { categoryId: params.category },
            { websiteCategories: { some: { categoryId: params.category } } },
          ],
        },
      ]
    : [];
  const where: Prisma.WebsiteWhereInput =
    baseFilters.length > 0 || categoryFilter.length > 0
      ? { AND: [...baseFilters, ...categoryFilter] }
      : {};

  const [websites, total, categories] = await Promise.all([
    db.website.findMany({ where, orderBy, skip, take: PAGE_SIZE }),
    db.website.count({ where }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const categoryCountRows = await Promise.all(
    categories.map(async (category) => {
      const countWhere: Prisma.WebsiteWhereInput = {
        AND: [
          ...baseFilters,
          {
            OR: [
              { categoryId: category.id },
              { websiteCategories: { some: { categoryId: category.id } } },
            ],
          },
        ],
      };

      const count = await db.website.count({ where: countWhere });
      return { categoryId: category.id, count };
    })
  );

  const categoryCountById = new Map(
    categoryCountRows.map((row) => [row.categoryId, row.count])
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);
  type WebsiteRow = (typeof websites)[number];

  return (
    <>
      <AppHeader
        title={`Websites (${total.toLocaleString()})`}
        rightSlot={
          <div className="flex gap-2">
            <BulkImportModal />
            <a
              href="/samples/websites-bulk-upload-template.csv"
              download
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" /></svg>
              Sample Excel
            </a>
            <Link href="/admin/websites/new" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Website
            </Link>
          </div>
        }
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <form className="flex gap-3 flex-wrap">
            <input name="q" defaultValue={params.q} placeholder="Search name or URL..." className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]" />
            <select name="type" defaultValue={params.type} className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]">
              <option value="">All Types</option>
              <option value="distribution">Distribution</option>
              <option value="guest_post">Guest Post</option>
              <option value="press_release">Press Release</option>
            </select>
            <select name="category" defaultValue={params.category} className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]">
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({(categoryCountById.get(category.id) ?? 0).toLocaleString()})
                </option>
              ))}
            </select>
            {activeSort && <input type="hidden" name="sort" value={activeSort} />}
            {activeSort && <input type="hidden" name="order" value={activeOrder} />}
            <button type="submit" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors">Filter</button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("website")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by website">
                      Website
                      {renderSortIcon("website")}
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("type")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by type">
                      Type
                      {renderSortIcon("type")}
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("da")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by DA">
                      DA
                      {renderSortIcon("da")}
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("pa")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by PA">
                      PA
                      {renderSortIcon("pa")}
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("spam")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by spam">
                      Spam
                      {renderSortIcon("spam")}
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("traffic")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by traffic">
                      Traffic
                      {renderSortIcon("traffic")}
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("status")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by status">
                      Status
                      {renderSortIcon("status")}
                    </Link>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Link href={getSortHref("added")} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors" aria-label="Sort by added date">
                      Added
                      {renderSortIcon("added")}
                    </Link>
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {websites.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">No websites found.</td></tr>
                ) : websites.map((site: WebsiteRow) => (
                  <tr key={site.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{site.name}</p>
                      <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#465FFF] hover:underline">{site.url}</a>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${typeStyle[site.type] ?? "bg-gray-100 text-gray-600"}`}>{site.type.replace("_", " ")}</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{site.da}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{site.pa ?? 0}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{site.spamScore ?? 0}%</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{(site.traffic ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${site.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{site.isActive ? "Active" : "Inactive"}</span>
                      {site.starRating && <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">{"★".repeat(site.starRating)}</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(site.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/websites/${site.id}`} className="text-xs font-medium text-[#465FFF] hover:underline">Edit →</Link>
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
              {page > 1 && <Link href={`/admin/websites?${buildQueryString({ page: String(page - 1) })}`} className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center transition-colors">Previous</Link>}
              {page < totalPages && <Link href={`/admin/websites?${buildQueryString({ page: String(page + 1) })}`} className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium flex items-center transition-colors">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
