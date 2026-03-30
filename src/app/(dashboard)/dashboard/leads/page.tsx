import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";
import {
  packageSlugFromServiceType,
  parseHireUsLeadNotes,
  resolveHireUsChecklistsFromCurationBatch,
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
  checklist: Array<{ id: string; label: string; stepLabel: string | null; completed: boolean }>
): Array<{ key: string; label: string; completed: number; items: Array<{ id: string; label: string; completed: boolean }> }> {
  const groups = new Map<
    string,
    {
      label: string;
      items: Array<{ id: string; label: string; completed: boolean }>;
    }
  >();

  for (const item of checklist) {
    const label = item.stepLabel ?? "General";
    const key = item.stepLabel ?? `fallback:${item.id}`;
    const group = groups.get(key);

    if (group) {
      group.items.push({ id: item.id, label: item.label, completed: item.completed });
    } else {
      groups.set(key, {
        label,
        items: [{ id: item.id, label: item.label, completed: item.completed }],
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
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">No Hire Us requests yet.</p>
            <Link
              href="/hire-us"
              className="h-10 px-6 rounded-xl bg-[#465FFF] text-white text-sm font-semibold inline-flex items-center hover:bg-[#3d55e8] transition-colors"
            >
              Browse Hire Us Packages
            </Link>
          </div>
        ) : (
          leadsWithResolvedChecklist.map(({ lead, parsedNotes, linkedCurationId }) => {
            const completedChecklistCount = parsedNotes
              ? parsedNotes.checklist.filter((item) => item.completed).length
              : 0;
            const checklistTotal = parsedNotes?.checklist.length ?? 0;
            const checklistGroups = parsedNotes ? groupChecklistByStep(parsedNotes.checklist) : [];
            const timeline = parsedNotes
              ? [...parsedNotes.timeline].sort((a, b) => +new Date(b.at) - +new Date(a.at))
              : [];

            return (
              <article key={lead.id} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#465FFF] font-semibold">{packageLabel(lead.serviceType)} Package</p>
                    <h2 className="text-lg font-semibold text-gray-900 mt-1">PublishRoad Team Execution</h2>
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
                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500 font-semibold">Execution Progress</p>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#465FFF]">
                        {toReadableState(parsedNotes.state)}
                      </span>
                    </div>

                    {checklistTotal > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">Checklist: {completedChecklistCount}/{checklistTotal} completed</p>
                        <div className="space-y-3">
                          {checklistGroups.map((group) => (
                            <div key={group.key} className="rounded-lg border border-gray-100 p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.12em] text-gray-500 font-semibold">{group.label}</p>
                                <span className="text-xs text-gray-500">
                                  {group.completed}/{group.items.length}
                                </span>
                              </div>
                              <div className="mt-2 space-y-2">
                                {group.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`flex items-center gap-2 text-sm ${item.completed ? "text-gray-800" : "text-gray-500"}`}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full ${item.completed ? "bg-emerald-500" : "bg-gray-300"}`}
                                    />
                                    <span>{item.label}</span>
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
                      href={`/dashboard/curations/${linkedCurationId}`}
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
