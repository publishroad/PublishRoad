"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { toast } from "sonner";
import {
  ALL_CURATION_SECTIONS,
  type CurationSectionKey,
} from "@/lib/curation-sections";

type CurationStepsResponse = {
  enabledSections: CurationSectionKey[];
};

const sectionMeta: Record<CurationSectionKey, { step: string; title: string; description: string }> = {
  a: { step: "Step 1", title: "Distribution Sites", description: "Directories and listing sites." },
  b: { step: "Step 2", title: "Guest Post & Backlinks", description: "Guest-post and backlink opportunities." },
  c: { step: "Step 3", title: "Press Release Sites", description: "Press release platforms." },
  d: { step: "Step 4", title: "Social Influencers", description: "Influencer outreach opportunities." },
  e: { step: "Step 5", title: "Reddit Communities", description: "Relevant subreddit communities." },
  f: { step: "Step 6", title: "Investors & Funds", description: "Fundraising and investor leads." },
};

async function fetchCurationStepConfig(): Promise<CurationStepsResponse> {
  const res = await fetch("/api/admin/curation-steps", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch curation step config");
  return res.json();
}

export default function AdminCurationStepsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-curation-steps"],
    queryFn: fetchCurationStepConfig,
    refetchOnWindowFocus: false,
  });

  const initialEnabled = useMemo<CurationSectionKey[]>(
    () => (data?.enabledSections ? [...data.enabledSections] : [...ALL_CURATION_SECTIONS]),
    [data]
  );
  const [draftSections, setDraftSections] = useState<CurationSectionKey[] | null>(null);

  const hasLoaded = !isLoading && !!data;
  const effectiveEnabled = hasLoaded
    ? draftSections ?? initialEnabled
    : [...ALL_CURATION_SECTIONS];

  const syncMutation = useMutation({
    mutationFn: async (sections: CurationSectionKey[]) => {
      const res = await fetch("/api/admin/curation-steps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledSections: sections }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to save configuration");
      }

      return (await res.json()) as CurationStepsResponse & { success: boolean };
    },
    onSuccess: (payload) => {
      setDraftSections(null);
      queryClient.setQueryData(["admin-curation-steps"], {
        enabledSections: payload.enabledSections,
      });
      toast.success("Curation step configuration saved");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save configuration");
    },
  });

  function toggleSection(section: CurationSectionKey) {
    setDraftSections((currentDraft) => {
      const current = currentDraft ?? effectiveEnabled;
      const set = new Set(current);
      if (set.has(section)) {
        if (set.size === 1) {
          toast.error("At least one step must remain enabled");
          return currentDraft;
        }
        set.delete(section);
      } else {
        set.add(section);
      }

      return ALL_CURATION_SECTIONS.filter((item) => set.has(item));
    });
  }

  const isDirty = hasLoaded && effectiveEnabled.join(",") !== initialEnabled.join(",");

  return (
    <>
      <AppHeader
        title="Curation Steps"
        rightSlot={
          <button
            type="button"
            onClick={() => syncMutation.mutate(effectiveEnabled)}
            disabled={!isDirty || syncMutation.isPending || isLoading}
            className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {syncMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        }
      />

      <div className="flex-1 p-6 max-w-4xl w-full mx-auto space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Changes apply only to newly generated curations. Existing generated curations remain unchanged.
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {ALL_CURATION_SECTIONS.map((section) => {
              const meta = sectionMeta[section];
              const checked = effectiveEnabled.includes(section);

              return (
                <label
                  key={section}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/70 cursor-pointer"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#465FFF]">{meta.step}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{meta.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{meta.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSection(section)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      checked ? "bg-[#465FFF]" : "bg-gray-300"
                    }`}
                    aria-pressed={checked}
                    aria-label={`Toggle ${meta.title}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        checked ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
