"use client";
// Client component with SSE streaming for real-time updates (REPLACED POLLING)

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useStreamingCuration } from "@/hooks/useStreamingCuration";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { ProgressTracker } from "@/components/dashboard/ProgressTracker";
import { UpsellBanner } from "@/components/dashboard/UpsellBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface CurationResult {
  id: string;
  websiteId: string;
  matchScore: number;
  matchReason: string | null;
  section: "a" | "b" | "c";
  rank: number;
  userStatus: "saved" | "hidden" | null;
  masked?: boolean;
  website?: {
    name: string;
    url: string;
    da: number;
    pa: number;
    spamScore: number;
    traffic: number;
    type: string;
  };
}

interface CurationData {
  id: string;
  productUrl: string;
  countryName?: string | null;
  categoryName?: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  keywords: string[];
  description: string | null;
  results: CurationResult[];
  maskedCount: number;
}

const sectionLabels = {
  a: "Distribution Sites",
  b: "Guest Post & Backlinks",
  c: "Press Release Sites",
};

const sectionDescriptions = {
  a: "Submit your product to these directories and listing sites.",
  b: "Pitch guest posts or request backlinks from these publications.",
  c: "Distribute your press release through these platforms.",
};

const sectionSteps = {
  a: "Step 1",
  b: "Step 2",
  c: "Step 3",
};

const sectionOrder = ["a", "b", "c"] as const;

export default function CurationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [showProgress, setShowProgress] = useState(false);
  const [updatingResultId, setUpdatingResultId] = useState<string | null>(null);

  // USE STREAMING HOOK instead of React Query polling
  // This replaces the previous refetchInterval: 3000 with real-time SSE
  const { data: curation, isLoading, error, isStreaming, mutate, refresh } = useStreamingCuration(id);

  useEffect(() => {
    if (curation?.status === "processing" || curation?.status === "pending") {
      setShowProgress(true);
    } else {
      setShowProgress(false);
    }
  }, [curation?.status]);

  const planSlug = session?.user?.planSlug ?? "free";
  const sectionA = curation?.results.filter((r) => r.section === "a") ?? [];
  const sectionB = curation?.results.filter((r) => r.section === "b") ?? [];
  const sectionC = curation?.results.filter((r) => r.section === "c") ?? [];

  const stepStats = {
    a: {
      total: sectionA.length,
      completed: sectionA.filter((result) => result.userStatus === "saved").length,
    },
    b: {
      total: sectionB.length,
      completed: sectionB.filter((result) => result.userStatus === "saved").length,
    },
    c: {
      total: sectionC.length,
      completed: sectionC.filter((result) => result.userStatus === "saved").length,
    },
  };

  const totalTasks = stepStats.a.total + stepStats.b.total + stepStats.c.total;
  const totalCompleted = stepStats.a.completed + stepStats.b.completed + stepStats.c.completed;
  const totalCompletionPercent = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

  let curationWebsiteName = curation?.productUrl ?? "Website";
  if (curation?.productUrl) {
    try {
      const parsed = new URL(curation.productUrl);
      curationWebsiteName = parsed.hostname + parsed.pathname.replace(/\/$/, "");
    } catch {
      curationWebsiteName = curation.productUrl;
    }
  }

  const motivationText =
    totalCompletionPercent >= 100
      ? "Outstanding execution. You completed every task and unlocked your strongest publishing momentum."
      : totalCompletionPercent >= 70
      ? "You are close to a full campaign rollout. Finish the remaining tasks to maximize authority, links, and visibility."
      : totalCompletionPercent >= 35
      ? "Great momentum. Keep pushing and your reach, trust signals, and referral traffic can compound quickly."
      : "Every completed task builds brand authority and search presence. Start with one step now and stack consistent wins.";

  async function handleTaskStatusChange(resultId: string, isComplete: boolean) {
    if (updatingResultId === resultId) return;

    const nextStatus = isComplete ? null : "saved";
    setUpdatingResultId(resultId);

    mutate((current) => {
      if (!current) return current;

      return {
        ...current,
        results: current.results.map((result) =>
          result.id === resultId ? { ...result, userStatus: nextStatus } : result
        ),
      };
    });

    try {
      const res = await fetch(`/api/curation-results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userStatus: nextStatus }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to update task status");
      }

      toast.success(nextStatus === "saved" ? "Task marked complete" : "Task marked incomplete");
      await refresh();
    } catch (err) {
      await refresh().catch(() => undefined);
      const message = err instanceof Error ? err.message : "Failed to update task status";
      toast.error(message);
    } finally {
      setUpdatingResultId(null);
    }
  }

  return (
    <>
      <AppHeader title="Curation Results" />
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !curation ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Curation not found.</p>
          </div>
        ) : (
          <>
            {/* Progress Tracker */}
            {showProgress && (curation.status === "processing" || curation.status === "pending") && (
              <div className="mb-6">
                <ProgressTracker
                  curationId={id}
                  onComplete={() => { setShowProgress(false); }}
                />
              </div>
            )}

            {/* Results Sections */}
            {curation.status === "completed" && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[28px] border border-[#dbe4ff] bg-[linear-gradient(130deg,#f8fbff_0%,#eef3ff_45%,#ffffff_100%)] p-5 shadow-[0_10px_35px_rgba(70,95,255,0.08)] sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#465FFF]">Campaign Progress</p>
                      <h3 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">{curationWebsiteName}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{motivationText}</p>
                    </div>
                    <div className="min-w-[230px] rounded-3xl border border-[#cfd9ff] bg-white/95 p-4 shadow-[0_10px_30px_rgba(70,95,255,0.12)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total Completion</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">{totalCompletionPercent}%</p>
                      <p className="text-sm text-slate-600">{totalCompleted} of {totalTasks} tasks done</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#465FFF_0%,#7C8DFF_100%)] transition-all"
                          style={{ width: `${totalCompletionPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {sectionOrder.map((section) => {
                      const completed = stepStats[section].completed;
                      const total = stepStats[section].total;
                      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                      return (
                        <div key={`summary-${section}`} className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#465FFF]">
                            {sectionSteps[section]}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{sectionLabels[section]}</p>
                          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                            <span>{completed}/{total} tasks</span>
                            <span className="font-semibold text-slate-700">{percent}%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#465FFF_0%,#7C8DFF_100%)]"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {curation.maskedCount > 0 && (
                  <UpsellBanner maskedCount={curation.maskedCount} planSlug={planSlug} />
                )}

                {sectionOrder.map((section) => {
                  const results = section === "a" ? sectionA : section === "b" ? sectionB : sectionC;
                  return (
                    <CurationSection
                      key={section}
                      section={section}
                      results={results}
                      updatingResultId={updatingResultId}
                      onToggleComplete={handleTaskStatusChange}
                    />
                  );
                })}
              </div>
            )}

            {/* Failed state */}
            {curation.status === "failed" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <p className="text-red-600 font-medium mb-2">Curation failed</p>
                <p className="text-gray-500 text-sm">
                  We encountered an error while processing your curation. Your credit has been refunded. Please try again.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function CurationSection({
  section,
  results,
  updatingResultId,
  onToggleComplete,
}: {
  section: keyof typeof sectionLabels;
  results: CurationResult[];
  updatingResultId: string | null;
  onToggleComplete: (resultId: string, isComplete: boolean) => void;
}) {
  const completedTasks = results.filter((result) => result.userStatus === "saved").length;
  const completionPercent = results.length === 0 ? 0 : Math.round((completedTasks / results.length) * 100);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#f5f7ff_52%,#ffffff_100%)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#465FFF]">
              {sectionSteps[section]}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{sectionLabels[section]}</h3>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {results.length} tasks
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">{sectionDescriptions[section]}</p>
          </div>

          <div className="min-w-[220px] rounded-3xl border border-[#dbe4ff] bg-white/95 p-4 shadow-[0_10px_30px_rgba(70,95,255,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Progress</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{completionPercent}% complete</p>
              </div>
              <div className="rounded-2xl bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#465FFF]">
                {completedTasks}/{results.length}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#465FFF_0%,#7C8DFF_100%)] transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Keep going. Each completed task moves this step forward.</p>
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-400">No results in this section.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {results.map((result) => (
            <ResultRow
              key={result.id}
              result={result}
              onToggleComplete={onToggleComplete}
              isUpdating={updatingResultId === result.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  result,
  onToggleComplete,
  isUpdating,
}: {
  result: CurationResult;
  onToggleComplete: (resultId: string, isComplete: boolean) => void;
  isUpdating: boolean;
}) {
  if (result.masked) {
    return (
      <div className="p-4 relative">
        <div className="blur-sm select-none pointer-events-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">██████████████</p>
              <p className="text-sm text-gray-400 mt-0.5">████████████████████████</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">DA: ██</p>
              <p className="text-xs text-gray-400 mt-0.5">PA: ██</p>
              <p className="text-xs text-gray-400 mt-0.5">Spam: ██%</p>
              <p className="text-xs text-gray-400 mt-0.5">Traffic: █████</p>
              <p className="text-xs text-gray-400 mt-0.5">Score: ████</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
            <span className="text-xs font-medium text-gray-700">🔒 Upgrade to unlock</span>
          </div>
        </div>
      </div>
    );
  }

  const website = result.website;
  const scorePercent = Math.round(result.matchScore * 100);
  const isComplete = result.userStatus === "saved";

  return (
    <div className={`group p-4 transition-colors sm:p-5 ${isComplete ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/70"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onToggleComplete(result.id, isComplete)}
          disabled={isUpdating}
          className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
            isComplete
              ? "border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.22)]"
              : "border-slate-300 bg-white text-transparent hover:border-[#465FFF] hover:bg-[#EEF2FF]"
          } ${isUpdating ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          aria-label={isComplete ? "Mark task incomplete" : "Mark task complete"}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415.005L3.29 9.204a1 1 0 111.42-1.408l4.09 4.123 6.492-6.63a1 1 0 011.412 0z" clipRule="evenodd" />
          </svg>
        </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isComplete ? "bg-emerald-100 text-emerald-700" : "bg-[#EEF2FF] text-[#465FFF]"}`}>
                  Task {result.rank}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#465FFF]">
                {scorePercent}% match
              </span>
              {isComplete && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Completed
                </span>
              )}
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-[0_6px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={website?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-lg font-semibold tracking-tight transition-colors ${isComplete ? "text-slate-700" : "text-slate-950 group-hover:text-[#465FFF]"}`}
                    >
                      {website?.name ?? "Unknown"}
                    </a>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">DA {website?.da ?? 0}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">PA {website?.pa ?? 0}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Spam {website?.spamScore ?? 0}%</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Traffic {(website?.traffic ?? 0).toLocaleString()}</span>
                  </div>

                  <a
                    href={website?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-sm text-[#465FFF] hover:underline"
                  >
                    {website?.url}
                  </a>

                  {result.matchReason && (
                    <p className={`mt-3 max-w-3xl text-sm leading-6 ${isComplete ? "text-slate-500" : "text-slate-600"}`}>
                      {result.matchReason}
                    </p>
                  )}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[180px]">
                  <a
                    href={website?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#465FFF] bg-white px-5 text-sm font-semibold text-[#465FFF] transition-colors hover:bg-[#EEF2FF]"
                  >
                    Submit Site
                  </a>
                  <button
                    type="button"
                    onClick={() => onToggleComplete(result.id, isComplete)}
                    disabled={isUpdating}
                    className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
                      isComplete
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-[#465FFF] text-white hover:bg-[#3647D6]"
                    } ${isUpdating ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    {isUpdating ? "Saving..." : isComplete ? "Completed" : "Mark Complete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
