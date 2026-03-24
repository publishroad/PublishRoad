"use client";
// Client component with SSE streaming for real-time updates (REPLACED POLLING)

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useStreamingCuration } from "@/hooks/useStreamingCuration";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { ProgressTracker } from "@/components/dashboard/ProgressTracker";
import { UpsellBanner } from "@/components/dashboard/UpsellBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  website?: { name: string; url: string; da: number; type: string };
}

interface CurationData {
  id: string;
  productUrl: string;
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

export default function CurationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [showProgress, setShowProgress] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // USE STREAMING HOOK instead of React Query polling
  // This replaces the previous refetchInterval: 3000 with real-time SSE
  const { data: curation, isLoading, error, isStreaming } = useStreamingCuration(id);

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

  async function handleDeleteCuration() {
    if (!curation || isDeleting) return;

    // Failed curations can be deleted directly with no confirmation popup.
    if (curation.status !== "failed") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this curation? Once deleted, you cannot get it back and your credit will be lost."
      );
      if (!confirmed) return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/curations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to delete curation");
      }

      toast.success("Curation deleted successfully");
      router.push("/dashboard/curations");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete curation";
      toast.error(message);
    } finally {
      setIsDeleting(false);
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
            {/* Header card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Product URL</p>
                  <a
                    href={curation.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#465FFF] hover:underline font-medium break-all text-sm"
                  >
                    {curation.productUrl}
                  </a>
                  {curation.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {curation.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="bg-[#EEF2FF] text-[#465FFF] text-xs px-2.5 py-0.5 rounded-full font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                    curation.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : curation.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {curation.status}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeleteCuration}
                  disabled={isDeleting}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Delete Curation"}
                </button>
              </div>
            </div>

            {/* Progress Tracker */}
            {showProgress && (curation.status === "processing" || curation.status === "pending") && (
              <div className="mb-6">
                <ProgressTracker
                  curationId={id}
                  onComplete={() => { setShowProgress(false); }}
                />
              </div>
            )}

            {/* Upsell Banner */}
            {curation.status === "completed" && curation.maskedCount > 0 && (
              <div className="mb-6">
                <UpsellBanner maskedCount={curation.maskedCount} planSlug={planSlug} />
              </div>
            )}

            {/* Results Tabs */}
            {curation.status === "completed" && (
              <Tabs defaultValue="a">
                <TabsList className="mb-4 bg-white border border-gray-200 rounded-xl p-1 h-auto">
                  {(["a", "b", "c"] as const).map((section) => {
                    const results = section === "a" ? sectionA : section === "b" ? sectionB : sectionC;
                    return (
                      <TabsTrigger
                        key={section}
                        value={section}
                        className="rounded-lg text-sm data-[state=active]:bg-[#465FFF] data-[state=active]:text-white"
                      >
                        {sectionLabels[section]}{" "}
                        <span className="ml-1 text-xs opacity-60">({results.length})</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {(["a", "b", "c"] as const).map((section) => {
                  const results = section === "a" ? sectionA : section === "b" ? sectionB : sectionC;
                  return (
                    <TabsContent key={section} value={section}>
                      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                          <h3 className="font-semibold text-gray-900 text-sm">{sectionLabels[section]}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{sectionDescriptions[section]}</p>
                        </div>
                        {results.length === 0 ? (
                          <p className="p-8 text-gray-400 text-center text-sm">No results in this section.</p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {results.map((result) => (
                              <ResultRow key={result.id} result={result} curationId={id} />
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
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

function ResultRow({ result, curationId }: { result: CurationResult; curationId: string }) {
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

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={website?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-900 hover:text-[#465FFF] transition-colors text-sm"
            >
              {website?.name ?? "Unknown"}
            </a>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">DA {website?.da ?? 0}</span>
          </div>
          <a
            href={website?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#465FFF] hover:underline truncate block mt-0.5"
          >
            {website?.url}
          </a>
          {result.matchReason && (
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{result.matchReason}</p>
          )}
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center bg-[#EEF2FF] text-[#465FFF] text-xs font-semibold px-2.5 py-1 rounded-full">
            {scorePercent}% match
          </span>
        </div>
      </div>
    </div>
  );
}
