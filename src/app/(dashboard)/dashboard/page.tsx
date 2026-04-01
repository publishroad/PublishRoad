// Cache dashboard for 60 seconds — data doesn't need real-time updates
export const revalidate = 60;

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { CurationCard } from "@/components/dashboard/CurationCard";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [recentCurations, user] = await Promise.all([
    db.curation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        results: {
          select: {
            section: true,
            userStatus: true,
          },
        },
      },
    }),
    db.user.findUnique({ where: { id: userId }, include: { plan: true } }),
  ]);

  const credits = user?.creditsRemaining ?? 0;
  const hasCredits = credits === -1 || credits > 0;

  const stats = [
    { label: "Current Plan", value: user?.plan?.name ?? "Free", link: { href: "/dashboard/billing", text: "Manage billing →" }, icon: "💳", iconBg: "bg-[#EEF2FF]" },
    { label: "Credits", value: credits === -1 ? "Unlimited" : String(credits), link: !hasCredits ? { href: "/dashboard/billing", text: "Get more →" } : undefined, icon: "⚡", iconBg: credits === 0 ? "bg-red-50" : credits <= 2 ? "bg-orange-50" : "bg-green-50" },
    { label: "Total Curations", value: recentCurations.length === 5 ? "5+" : String(recentCurations.length), link: { href: "/dashboard/curations", text: "View all →" }, icon: "📋", iconBg: "bg-blue-50" },
  ];

  return (
    <>
      <AppHeader
        title="Dashboard"
        rightSlot={
          hasCredits ? (
            <Link href="/dashboard/new-curation" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Curation
            </Link>
          ) : undefined
        }
      />
      <div className="flex-1 w-full max-w-4xl mx-auto space-y-5 p-4 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.iconBg}`}>{s.icon}</div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                {s.link && <Link href={s.link.href} className="text-xs font-medium text-[#465FFF] hover:underline mt-0.5 block">{s.link.text}</Link>}
              </div>
            </div>
          ))}
        </div>

        {/* CTA banner */}
        {hasCredits ? (
          <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-5 sm:p-6">
            <div className="absolute right-0 top-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(70,95,255,0.3) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-white font-semibold text-base">Ready to launch?</h2>
                <p className="text-gray-400 text-sm mt-1">Create a curation to get your personalised distribution plan.</p>
              </div>
              <Link href="/dashboard/new-curation" className="relative h-10 px-5 rounded-xl bg-[#465FFF] text-white text-sm font-semibold hover:bg-[#3d55e8] inline-flex items-center justify-center transition-colors w-full sm:w-auto">New Curation →</Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-4 text-sm">No credits remaining. Upgrade to create more curations.</p>
            <Link href="/dashboard/billing" className="h-10 px-6 rounded-xl bg-[#465FFF] text-white text-sm font-semibold inline-flex items-center hover:bg-[#3d55e8] transition-colors">Upgrade Plan</Link>
          </div>
        )}

        {/* Recent curations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Curations</h2>
            {recentCurations.length > 0 && <Link href="/dashboard/curations" className="text-xs font-medium text-[#465FFF] hover:underline">View all →</Link>}
          </div>
          {recentCurations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <p className="text-gray-400 text-sm mb-4">No curations yet.</p>
              {hasCredits ? (
                <Link href="/dashboard/new-curation" className="h-9 px-5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium inline-flex items-center hover:bg-gray-50 transition-colors">Create Your First Curation</Link>
              ) : (
                <Link href="/dashboard/billing" className="h-9 px-5 rounded-xl bg-[#465FFF] text-white text-sm font-semibold inline-flex items-center hover:bg-[#3d55e8] transition-colors">Upgrade Plan</Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentCurations.map((c) => {
                const progress = c.results.reduce(
                  (acc, result) => {
                    if (result.section !== "a" && result.section !== "b" && result.section !== "c") {
                      return acc;
                    }
                    acc[result.section].total += 1;
                    if (result.userStatus === "saved") {
                      acc[result.section].completed += 1;
                    }
                    return acc;
                  },
                  {
                    a: { total: 0, completed: 0 },
                    b: { total: 0, completed: 0 },
                    c: { total: 0, completed: 0 },
                  }
                );

                return (
                  <CurationCard
                    key={c.id}
                    id={c.id}
                    productUrl={c.productUrl}
                    status={c.status as "pending" | "processing" | "completed" | "failed"}
                    createdAt={c.createdAt}
                    progress={progress}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
