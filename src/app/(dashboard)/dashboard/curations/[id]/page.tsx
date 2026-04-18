"use client";
// Client component with SSE streaming for real-time updates (REPLACED POLLING)

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useStreamingCuration } from "@/hooks/useStreamingCuration";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { ProgressTracker } from "@/components/dashboard/ProgressTracker";
import { UpsellBanner } from "@/components/dashboard/UpsellBanner";
import { HireUsPackageSelector } from "@/components/public/HireUsPackageSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface CurationResult {
  id: string;
  websiteId?: string | null;
  influencerId?: string | null;
  redditChannelId?: string | null;
  fundId?: string | null;
  matchScore: number;
  matchReason: string | null;
  section: "a" | "b" | "c" | "d" | "e" | "f";
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
  influencer?: {
    name: string;
    platform: string;
    followersCount: number;
    profileLink: string;
  };
  redditChannel?: {
    name: string;
    url: string;
    totalMembers: number;
    weeklyVisitors: number;
    postingDifficulty: string | null;
  };
  fund?: {
    name: string;
    websiteUrl: string;
    investmentStage: string | null;
    ticketSize: string | null;
    logoUrl: string | null;
  };
}

const sectionLabels = {
  a: "Distribution Sites",
  b: "Guest Post & Backlinks",
  c: "Press Release Sites",
  d: "Social Influencers",
  e: "Reddit Communities",
  f: "Investors & Funds",
};

const sectionDescriptions = {
  a: "Submit your product to these directories and listing sites.",
  b: "Pitch guest posts or request backlinks from these publications.",
  c: "Distribute your press release through these platforms.",
  d: "Reach out to these influencers to promote your product to their audience.",
  e: "Post in these subreddits to engage your target community.",
  f: "These investors match your product's stage and category.",
};

const sectionSteps = {
  a: "Step 1",
  b: "Step 2",
  c: "Step 3",
  d: "Step 4",
  e: "Step 5",
  f: "Step 6",
} as const;

const sectionOrder = ["a", "b", "c", "d", "e", "f"] as const;
const bookingCtaUrl = "https://tidycal.com/publish-road/curation-discussion";

const platformColors: Record<string, string> = {
  tiktok: "bg-gray-900 text-white",
  instagram: "bg-pink-50 text-pink-700",
  youtube: "bg-red-50 text-red-700",
  twitter: "bg-sky-50 text-sky-700",
};

const platformLabels: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter (X)",
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-50 text-green-700",
  medium: "bg-yellow-50 text-yellow-700",
  hard: "bg-red-50 text-red-700",
};

const stageLabels: Record<string, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  growth: "Growth",
  late_stage: "Late Stage",
};

export default function CurationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [showProgress, setShowProgress] = useState(false);
  const [updatingResultId, setUpdatingResultId] = useState<string | null>(null);
  const [hireUsDialogOpen, setHireUsDialogOpen] = useState(false);
  const [hireUsSourceSection, setHireUsSourceSection] = useState<"d" | "e" | "f">("d");

  const { data: curation, isLoading, mutate, refresh } = useStreamingCuration(id);

  useEffect(() => {
    if (curation?.status === "processing" || curation?.status === "pending") {
      setShowProgress(true);
    } else {
      setShowProgress(false);
    }
  }, [curation?.status]);

  const planSlug = session?.user?.planSlug ?? "free";
  const userWatermarkEmail = session?.user?.email ?? "";

  const sectionResults = {
    a: curation?.results.filter((r) => r.section === "a") ?? [],
    b: curation?.results.filter((r) => r.section === "b") ?? [],
    c: curation?.results.filter((r) => r.section === "c") ?? [],
    d: curation?.results.filter((r) => r.section === "d") ?? [],
    e: curation?.results.filter((r) => r.section === "e") ?? [],
    f: curation?.results.filter((r) => r.section === "f") ?? [],
  };

  const stepStats = Object.fromEntries(
    sectionOrder.map((s) => [
      s,
      {
        total: sectionResults[s].length,
        completed: sectionResults[s].filter((r) => r.userStatus === "saved").length,
      },
    ])
  ) as Record<typeof sectionOrder[number], { total: number; completed: number }>;

  const totalTasks = sectionOrder.reduce((sum, s) => sum + stepStats[s].total, 0);
  const totalCompleted = sectionOrder.reduce((sum, s) => sum + stepStats[s].completed, 0);
  const totalCompletionPercent = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

  let curationWebsiteName = curation?.siteValidation?.title?.trim() || curation?.productUrl || "Website";
  if (!curation?.siteValidation?.title && curation?.productUrl) {
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

  function handleProtectedContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest("a, button, input, textarea, select, [role='button']");
    if (!isInteractive) {
      e.preventDefault();
    }
  }

  const enabledSections =
    curation?.enabledSections?.filter((section): section is (typeof sectionOrder)[number] =>
      sectionOrder.includes(section)
    ) ?? sectionOrder;
  const sectionsToShow = curation?.status === "completed" ? enabledSections : [];

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
                {curation.hireUsLead && (
                  <div className="rounded-2xl border border-[#dbe4ff] bg-[linear-gradient(125deg,#f8fbff_0%,#eef3ff_45%,#ffffff_100%)] p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-[#465FFF] font-semibold">PublishRoad Team Status</p>
                    <p className="text-sm text-slate-700 mt-2">
                      This curation is part of your Hire Us {curation.hireUsLead.packageSlug === "complete" ? "Complete" : "Starter"} package.
                      Our team is handling execution, and you can track actions and updates in your Hire Us tab.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Link
                        href="/dashboard/hire-us"
                        className="inline-flex items-center h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors"
                      >
                        View Team Updates
                      </Link>
                      <a
                        href={bookingCtaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center h-9 px-4 rounded-xl border border-[#465FFF] bg-white text-[#465FFF] text-sm font-medium hover:bg-[#EEF2FF] transition-colors"
                      >
                        Book a meeting
                      </a>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-[28px] border border-[#dbe4ff] bg-[linear-gradient(130deg,#f8fbff_0%,#eef3ff_45%,#ffffff_100%)] p-5 shadow-[0_10px_35px_rgba(70,95,255,0.08)] sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#465FFF]">Campaign Progress</p>
                      <h3 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">{curationWebsiteName}</h3>
                      {curation.siteValidation?.description && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {curation.siteValidation.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm leading-6 text-slate-600">{motivationText}</p>

                      {curation.siteValidation?.warning && (
                        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          {curation.siteValidation.warning}
                        </p>
                      )}
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
                    {sectionsToShow.map((section) => {
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

                  {!curation.hireUsLead && (
                    <div className="mt-5 flex flex-col items-center justify-center gap-2 border-t border-[#dbe4ff] pt-4 text-center">
                      <p className="text-sm text-slate-600">Need help Completeing the task? let our team Execute this for you.</p>
                      <div className="flex w-full flex-col items-center justify-center gap-2 sm:w-auto sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            setHireUsSourceSection("d");
                            setHireUsDialogOpen(true);
                          }}
                          className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full bg-[#465FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3647D6]"
                        >
                          Hire Us
                        </button>
                        <a
                          href={bookingCtaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full border border-[#465FFF] bg-white px-5 text-sm font-semibold text-[#465FFF] transition-colors hover:bg-[#EEF2FF]"
                        >
                          Book a meeting
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {curation.maskedCount > 0 && (
                  <UpsellBanner maskedCount={curation.maskedCount} planSlug={planSlug} />
                )}

                <div
                  id="curation-list"
                  className="scroll-mt-24 space-y-4 relative"
                  style={{ userSelect: "none" }}
                  onContextMenu={handleProtectedContextMenu}
                >
                  <WatermarkOverlay email={userWatermarkEmail} />
                  {sectionsToShow.map((section) => (
                    <CurationSection
                      key={section}
                      section={section}
                      results={sectionResults[section]}
                      locked={(curation.lockedSections ?? []).includes(section)}
                      planSlug={curation.planSlug ?? "free"}
                      updatingResultId={updatingResultId}
                      onToggleComplete={handleTaskStatusChange}
                    />
                  ))}

                  {!curation.hireUsLead && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4 text-center sm:px-6">
                      <p className="text-sm text-slate-600">Need help Completeing the task? let our team Execute this for you.</p>
                      <div className="mt-3 flex w-full flex-col items-center justify-center gap-2 sm:w-auto sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            setHireUsSourceSection("d");
                            setHireUsDialogOpen(true);
                          }}
                          className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full bg-[#465FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3647D6]"
                        >
                          Hire Us
                        </button>
                        <a
                          href={bookingCtaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-full border border-[#465FFF] bg-white px-5 text-sm font-semibold text-[#465FFF] transition-colors hover:bg-[#EEF2FF]"
                        >
                          Book a meeting
                        </a>
                      </div>
                    </div>
                  )}
                </div>
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

      <Dialog open={hireUsDialogOpen} onOpenChange={setHireUsDialogOpen}>
        <DialogContent className="max-h-[90vh] !w-[96vw] !max-w-[96vw] sm:!max-w-[92vw] xl:!max-w-6xl overflow-y-auto rounded-3xl p-0">
          <DialogHeader className="px-6 pb-0 pt-6 text-center">
            <DialogTitle className="text-xl text-slate-950">Choose a Hire Us package</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
            <HireUsPackageSelector
              variant="dashboard"
              loginCallbackBasePath={`/dashboard/curations/${id}`}
              dashboardIntroTitle="Done-for-you execution"
              dashboardIntroSubtitle="Pick a package and we will handle submissions, outreach, and reporting for this curation."
              sourceContext={{
                source: "dashboard_curation_steps",
                curationId: id,
                sectionKey: hireUsSourceSection,
                stepLabel: sectionSteps[hireUsSourceSection] as "Step 4" | "Step 5" | "Step 6",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WatermarkOverlay({ email }: { email: string }) {
  if (!email) return null;
  const svgContent = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='180'><text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' font-family='system-ui, sans-serif' font-size='13' font-weight='500' fill='%23465FFF' transform='rotate(-30, 170, 90)'>${encodeURIComponent(email)}</text></svg>`;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        userSelect: "none",
        backgroundImage: `url("data:image/svg+xml,${svgContent}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "340px 180px",
        opacity: 0.045,
        zIndex: 10,
      }}
    />
  );
}

const upgradeTargetLabel: Record<string, string> = {
  free: "Starter or Pro",
  starter: "Pro",
};

function CurationSection({
  section,
  results,
  locked,
  planSlug,
  updatingResultId,
  onToggleComplete,
}: {
  section: keyof typeof sectionLabels;
  results: CurationResult[];
  locked: boolean;
  planSlug: string;
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
              {locked ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Locked
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {results.length} tasks
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-slate-600">{sectionDescriptions[section]}</p>
          </div>

          {!locked && (
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
            </div>
          )}
        </div>
      </div>

      {locked ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl">
            🔒
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              Upgrade to unlock {sectionLabels[section]}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {upgradeTargetLabel[planSlug] ?? "a higher plan"} plan includes this section with up to 20 results.
            </p>
          </div>
          <a
            href="/dashboard/billing"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#465FFF] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#3647D6]"
          >
            Upgrade Now
          </a>
        </div>
      ) : results.length === 0 ? (
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

  const scorePercent = Math.round(result.matchScore * 100);
  const isComplete = result.userStatus === "saved";

  // Determine entity type and data
  const isInfluencer = result.section === "d";
  const isReddit = result.section === "e";
  const isFund = result.section === "f";
  const isWebsite = !isInfluencer && !isReddit && !isFund;

  const entityName =
    result.website?.name ??
    result.influencer?.name ??
    result.redditChannel?.name ??
    result.fund?.name ??
    "Unknown";

  const entityUrl =
    result.website?.url ??
    result.influencer?.profileLink ??
    result.redditChannel?.url ??
    result.fund?.websiteUrl ??
    "#";

  const actionLabel = isInfluencer
    ? "View Profile"
    : isReddit
    ? "Visit Subreddit"
    : isFund
    ? "Visit Fund"
    : result.section === "b"
    ? "Pitch Guest Post"
    : result.section === "c"
    ? "Submit Press Release"
    : "Submit Product";

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
                      href={entityUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-lg font-semibold tracking-tight transition-colors ${isComplete ? "text-slate-700" : "text-slate-950 group-hover:text-[#465FFF]"}`}
                    >
                      {entityName}
                    </a>

                    {/* Website metrics */}
                    {isWebsite && result.website && (
                      <>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">DA {result.website.da}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">PA {result.website.pa}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Spam {result.website.spamScore}%</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Traffic {(result.website.traffic).toLocaleString()}/mo</span>
                      </>
                    )}

                    {/* Influencer metrics */}
                    {isInfluencer && result.influencer && (
                      <>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${platformColors[result.influencer.platform] ?? "bg-gray-100 text-gray-600"}`}>
                          {platformLabels[result.influencer.platform] ?? result.influencer.platform}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                          {result.influencer.followersCount.toLocaleString()} followers
                        </span>
                      </>
                    )}

                    {/* Reddit metrics */}
                    {isReddit && result.redditChannel && (
                      <>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                          {result.redditChannel.totalMembers.toLocaleString()} members
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                          {result.redditChannel.weeklyVisitors.toLocaleString()} weekly visitors
                        </span>
                        {result.redditChannel.postingDifficulty && (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${difficultyColors[result.redditChannel.postingDifficulty] ?? "bg-gray-100 text-gray-600"}`}>
                            {result.redditChannel.postingDifficulty} posting
                          </span>
                        )}
                      </>
                    )}

                    {/* Fund metrics */}
                    {isFund && result.fund && (
                      <>
                        {result.fund.investmentStage && (
                          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                            {stageLabels[result.fund.investmentStage] ?? result.fund.investmentStage}
                          </span>
                        )}
                        {result.fund.ticketSize && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            {result.fund.ticketSize}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <a
                    href={entityUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-sm text-[#465FFF] hover:underline"
                  >
                    {entityUrl}
                  </a>

                  {result.matchReason && (
                    <Tooltip>
                      <TooltipTrigger className="mt-3 block max-w-3xl text-left">
                        <span
                          className={`block cursor-help text-sm leading-6 transition-colors ${isComplete ? "text-slate-500 hover:text-slate-600" : "text-slate-600 hover:text-slate-700"}`}
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {result.matchReason}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md whitespace-normal break-words" side="top">
                        {result.matchReason}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[180px]">
                  <a
                    href={entityUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#465FFF] bg-white px-5 text-sm font-semibold text-[#465FFF] transition-colors hover:bg-[#EEF2FF]"
                  >
                    {actionLabel}
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
