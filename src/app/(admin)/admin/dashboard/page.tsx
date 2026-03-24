// Cache admin metrics for 60 seconds — real-time not required
export const revalidate = 60;

import { db } from "@/lib/db";
import { redisGet, redisSet } from "@/lib/redis";
import { formatCurrency } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";

async function getMetrics() {
  const cached = await redisGet<{
    totalUsers: number; totalCurations: number; totalRevenue: number;
    signupsThisWeek: number; curationsThisWeek: number; pendingLeads: number;
  }>("admin:metrics");
  if (cached) return cached;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalUsers, totalCurations, revenueResult, signupsThisWeek, curationsThisWeek, pendingLeads] =
    await Promise.all([
      db.user.count(),
      db.curation.count(),
      db.payment.aggregate({ _sum: { amountCents: true }, where: { status: "completed" } }),
      db.user.count({ where: { createdAt: { gte: weekAgo } } }),
      db.curation.count({ where: { createdAt: { gte: weekAgo } } }),
      db.serviceLead.count({ where: { status: "new" } }),
    ]);

  const metrics = { totalUsers, totalCurations, totalRevenue: revenueResult._sum.amountCents ?? 0, signupsThisWeek, curationsThisWeek, pendingLeads };
  await redisSet("admin:metrics", metrics, 300);
  return metrics;
}

export default async function AdminDashboardPage() {
  const m = await getMetrics();

  const stats = [
    { label: "Total Users", value: m.totalUsers.toLocaleString(), sub: `+${m.signupsThisWeek} this week`, icon: "👥", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Total Curations", value: m.totalCurations.toLocaleString(), sub: `+${m.curationsThisWeek} this week`, icon: "📋", iconBg: "bg-[#EEF2FF]", iconColor: "text-[#465FFF]" },
    { label: "Total Revenue", value: formatCurrency(m.totalRevenue, "USD"), sub: "All time", icon: "💰", iconBg: "bg-green-50", iconColor: "text-green-600" },
    { label: "Pending Leads", value: m.pendingLeads.toLocaleString(), sub: "Awaiting response", icon: "📬", iconBg: "bg-orange-50", iconColor: "text-orange-600" },
  ];

  const quickLinks = [
    { label: "Add Website", href: "/admin/websites?action=add" },
    { label: "Manage Pricing", href: "/admin/pricing" },
    { label: "New Blog Post", href: "/admin/blog/new" },
    { label: "View Leads", href: "/admin/leads" },
    { label: "AI Settings", href: "/admin/settings" },
    { label: "Audit Logs", href: "/admin/audit-logs" },
  ];

  return (
    <>
      <AppHeader title="Dashboard" />
      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.iconBg}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:border-[#465FFF] hover:text-[#465FFF] hover:bg-[#EEF2FF] transition-all"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
