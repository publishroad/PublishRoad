// Cache curation list for 60 seconds — pagination handles data freshness
export const revalidate = 60;

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { CurationCard } from "@/components/dashboard/CurationCard";
import { decodeCursor, encodeCursor } from "@/lib/utils";

const PAGE_SIZE = 20;

export default async function CurationsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const session = await auth();
  const userId = session!.user.id;
  const params = await searchParams;
  const cursor = params.cursor ? decodeCursor(params.cursor) : null;

  const [curations, user] = await Promise.all([
    db.curation.findMany({
      where: { userId, ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      include: {
        results: {
          select: {
            section: true,
            userStatus: true,
          },
        },
      },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { creditsRemaining: true },
    }),
  ]);

  const credits = user?.creditsRemaining ?? 0;
  const hasCredits = credits === -1 || credits > 0;
  const hasMore = curations.length > PAGE_SIZE;
  const items = hasMore ? curations.slice(0, PAGE_SIZE) : curations;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  return (
    <>
      <AppHeader
        title="My Curations"
        rightSlot={
          hasCredits ? (
            <Link href="/dashboard/new-curation" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Curation
            </Link>
          ) : (
            <Link href="/dashboard/billing" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors">
              Get Credits
            </Link>
          )
        }
      />
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">No curations yet.</p>
            {hasCredits ? (
              <Link href="/dashboard/new-curation" className="h-9 px-5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium inline-flex items-center hover:bg-gray-50 transition-colors">Create Your First Curation</Link>
            ) : (
              <Link href="/dashboard/billing" className="h-9 px-5 rounded-xl bg-[#465FFF] text-white text-sm font-semibold inline-flex items-center hover:bg-[#3d55e8] transition-colors">Upgrade Plan</Link>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((c) => {
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
            {nextCursor && (
              <div className="mt-6 text-center">
                <Link href={`/dashboard/curations?cursor=${nextCursor}`} className="h-9 px-5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium inline-flex items-center hover:bg-gray-50 transition-colors">Load More</Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
