import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { HireUsPackageSelector } from "@/components/public/HireUsPackageSelector";
import {
  packageSlugFromServiceType,
  parseHireUsLeadNotes,
  resolveHireUsChecklistsFromCurationBatch,
  resolveLeadDisplayNames,
  type HireUsLeadState,
} from "@/lib/hire-us";

function packageLabel(serviceType: string | null): string {
  if (serviceType === "hire_us_complete") return "Complete";
  if (serviceType === "hire_us_starter") return "Starter";
  return "Service";
}

function findCurationIdFromNotes(notes: string | null): string | null {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes) as { curationId?: unknown };
    return typeof parsed.curationId === "string" ? parsed.curationId : null;
  } catch {
    return null;
  }
}

function toReadableState(state: HireUsLeadState): string {
  if (state === "started") return "Started";
  if (state === "working") return "Working";
  return "Completed";
}

function formatTimelineTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function groupChecklistByStep(
  checklist: Array<{
    id: string;
    label: string;
    stepLabel: string | null;
    completed: boolean;
    completionNote: string | null;
  }>
): Array<{
  key: string;
  label: string;
  completed: number;
  items: Array<{ id: string; label: string; completed: boolean; completionNote: string | null }>;
}> {
  const groups = new Map<
    string,
    {
      label: string;
      items: Array<{ id: string; label: string; completed: boolean; completionNote: string | null }>;
    }
  >();

  for (const item of checklist) {
    const label = item.stepLabel ?? "General";
    const key = item.stepLabel ?? `fallback:${item.id}`;
    const group = groups.get(key);

    if (group) {
      group.items.push({
        id: item.id,
        label: item.label,
        completed: item.completed,
        completionNote: item.completionNote,
      });
    } else {
      groups.set(key, {
        label,
        items: [
          {
            id: item.id,
            label: item.label,
            completed: item.completed,
            completionNote: item.completionNote,
          },
        ],
      });
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => ({
    key,
    label: group.label,
    completed: group.items.filter((item) => item.completed).length,
    items: group.items,
  }));
}

export default async function DashboardLeadsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const leads = await db.serviceLead.findMany({
    where: {
      userId,
      serviceType: { in: ["hire_us_starter", "hire_us_complete"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const parsedLeads = leads.map((lead) => {
    const packageSlug = packageSlugFromServiceType(lead.serviceType);
    const parsedNotes = packageSlug ? parseHireUsLeadNotes(lead.notes, packageSlug) : null;
    return { lead, parsedNotes };
  });

  const batchInputs = parsedLeads.map(({ lead, parsedNotes }) => ({
    knownCurationId: parsedNotes?.curationId ?? findCurationIdFromNotes(lead.notes),
    notesRaw: lead.notes,
    message: lead.message,
    existingChecklist: parsedNotes?.checklist ?? [],
  }));

  const resolvedChecklists = await resolveHireUsChecklistsFromCurationBatch({
    userId,
    leads: batchInputs,
  });

  const leadsWithResolvedChecklist = parsedLeads.map(({ lead, parsedNotes }, index) => {
    if (!parsedNotes) {
      return {
        lead,
        parsedNotes: null,
        linkedCurationId: findCurationIdFromNotes(lead.notes),
      };
    }

    const resolved = resolvedChecklists[index];
    return {
      lead,
      parsedNotes: {
        ...parsedNotes,
        checklist: resolved?.checklist ?? parsedNotes.checklist,
        curationId: resolved?.linkedCurationId ?? parsedNotes.curationId,
      },
      linkedCurationId: resolved?.linkedCurationId ?? parsedNotes.curationId,
    };
  });

  const curationProductUrls = await resolveLeadDisplayNames(
    leadsWithResolvedChecklist.map((l) => ({
      linkedCurationId: l.linkedCurationId,
      websiteUrl: l.lead.websiteUrl,
    }))
  );

  const statusStyle: Record<string, string> = {
    new: "bg-[#EEF2FF] text-[#465FFF]",
    contacted: "bg-orange-50 text-orange-700",
    closed: "bg-green-50 text-green-700",
  };

  return (
    <>
      <AppHeader title="Hire Us" />
      <div className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-4">
        {leads.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
            <HireUsPackageSelector
              variant="dashboard"
              loginCallbackBasePath="/dashboard/hire-us"
              preselectedPackage="starter"
            />
          </div>
        ) : (
          leadsWithResolvedChecklist.map(({ lead, parsedNotes, linkedCurationId }) => {
            const websiteName = (linkedCurationId ? curationProductUrls.get(linkedCurationId) : undefined) ?? lead.websiteUrl ?? null;
            const completedChecklistCount = parsedNotes
              ? parsedNotes.checklist.filter((item) => item.completed).length
              : 0;
            const checklistTotal = parsedNotes?.checklist.length ?? 0;
            const progressPercent = checklistTotal > 0 ? Math.round((completedChecklistCount / checklistTotal) * 100) : 0;
            const checklistGroups = parsedNotes ? groupChecklistByStep(parsedNotes.checklist) : [];
            const timeline = parsedNotes
              ? [...parsedNotes.timeline].sort((a, b) => +new Date(b.at) - +new Date(a.at))
              : [];

            return (
              <article key={lead.id} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
                {websiteName && (
                  <h2 className="text-xl font-bold text-gray-900 mb-3 break-all">{websiteName}</h2>
                )}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#465FFF] font-semibold">{packageLabel(lead.serviceType)} Package</p>
                    <p className="text-xs text-gray-400 mt-1">Started {formatDate(lead.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyle[lead.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {lead.status}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-[#dbe4ff] bg-[#f8faff] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#465FFF] font-semibold">Team Update</p>
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">
                    {lead.message ?? "Your request has been received. The PublishRoad team will post updates here."}
                  </p>
                </div>

                {parsedNotes && (
                  <div className="mt-4 rounded-[1.25rem] border border-[#d8e7df] bg-[linear-gradient(180deg,#f8fcfa_0%,#ffffff_100%)] p-4 shadow-[0_10px_30px_rgba(26,71,52,0.05)]">
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#547064] font-semibold">Execution Progress</p>
                        <p className="text-sm text-[#496357] mt-1">We are actively moving through your outreach list and updating items as they are completed.</p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#edf7f1] text-[#2f6f4f] border border-[#d7eadf]">
                        {toReadableState(parsedNotes.state)}
                      </span>
                    </div>

                    {checklistTotal > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-[#6c8578] font-semibold">Overall Progress</p>
                            <p className="text-sm text-[#496357] mt-1">{completedChecklistCount} of {checklistTotal} tasks completed</p>
                          </div>
                          <p className="text-2xl font-semibold text-[#214d38]">{progressPercent}%</p>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-[#e4efe8] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#73c69a_0%,#3f8f67_100%)] transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="space-y-3">
                          {checklistGroups.map((group) => (
                            <div key={group.key} className="mt-4 rounded-xl border border-[#e0ebe4] bg-white/85 p-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.14em] text-[#61786d] font-semibold">{group.label}</p>
                                <span className="inline-flex items-center rounded-full bg-[#f3f8f5] px-2.5 py-1 text-xs text-[#587164] border border-[#e1ece5]">
                                  {group.completed}/{group.items.length}
                                </span>
                              </div>
                              <div className="mt-3 space-y-2.5">
                                {group.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${
                                      item.completed
                                        ? "border-[#d6eadf] bg-[#f6fbf8] text-[#244734]"
                                        : "border-[#edf2ee] bg-[#fcfdfc] text-[#718579]"
                                    }`}
                                  >
                                    <span
                                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                        item.completed
                                          ? "bg-[#dff2e7] text-[#2f7a55]"
                                          : "bg-[#eef2ef] text-[#8a9a91]"
                                      }`}
                                    >
                                      {item.completed ? "✓" : ""}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="leading-5">{item.label}</p>
                                      {item.completed && item.completionNote && (
                                        <p className="mt-1.5 text-xs text-[#5f7267] whitespace-pre-line">
                                          {item.completionNote}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500 font-semibold">Activity Timeline</p>
                      {timeline.length === 0 ? (
                        <p className="text-sm text-gray-500 mt-2">No timeline updates yet.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {timeline.map((entry) => (
                            <div key={entry.id} className="rounded-lg border border-gray-100 p-3">
                              <p className="text-sm text-slate-700 whitespace-pre-line">{entry.text}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatTimelineTime(entry.at)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  {linkedCurationId ? (
                    <Link
                      href={`/dashboard/curations/${linkedCurationId}#curation-list`}
                      className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] inline-flex items-center transition-colors"
                    >
                      View Linked Curation
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/new-curation"
                      className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] inline-flex items-center transition-colors"
                    >
                      Start Curation
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
