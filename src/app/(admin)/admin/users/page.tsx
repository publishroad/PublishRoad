// Cache users list for 60 seconds — admin view, changes are infrequent
export const revalidate = 60;
import { db } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";

interface SearchParams { q?: string; plan?: string; page?: string; }
const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(params.q ? { OR: [{ name: { contains: params.q, mode: "insensitive" as const } }, { email: { contains: params.q, mode: "insensitive" as const } }] } : {}),
    ...(params.plan ? { plan: { slug: params.plan } } : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({ where, include: { plan: { select: { name: true, slug: true } } }, orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE }),
    db.user.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    starter: "bg-blue-50 text-blue-700",
    pro: "bg-[#EEF2FF] text-[#465FFF]",
    lifetime: "bg-purple-50 text-purple-700",
  };

  return (
    <>
      <AppHeader title={`Users (${total.toLocaleString()})`} />
      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <form className="flex gap-3 flex-wrap">
            <input name="q" defaultValue={params.q} placeholder="Search name or email..." className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]" />
            <select name="plan" defaultValue={params.plan} className="h-9 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF]">
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="lifetime">Lifetime</option>
            </select>
            <button type="submit" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors">Filter</button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credits</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">No users found.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#465FFF] text-sm font-semibold shrink-0">
                          {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${planColors[user.plan?.slug ?? "free"] ?? "bg-gray-100 text-gray-600"}`}>
                        {user.plan?.name ?? "Free"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-medium">{user.creditsRemaining === -1 ? "∞" : user.creditsRemaining}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/users/${user.id}`} className="text-xs font-medium text-[#465FFF] hover:underline">Manage →</Link>
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
              {page > 1 && <Link href={`/admin/users?page=${page - 1}${params.q ? `&q=${params.q}` : ""}${params.plan ? `&plan=${params.plan}` : ""}`} className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center transition-colors">Previous</Link>}
              {page < totalPages && <Link href={`/admin/users?page=${page + 1}${params.q ? `&q=${params.q}` : ""}${params.plan ? `&plan=${params.plan}` : ""}`} className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center transition-colors">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
