"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type LeadStatus = "new" | "contacted" | "closed";
type LeadState = "started" | "working" | "completed";

type ChecklistItem = {
  id: string;
  label: string;
  stepKey: string | null;
  stepLabel: string | null;
  completed: boolean;
};

type TimelineItem = {
  id: string;
  type: "state_change" | "checklist_update" | "admin_update" | "system";
  text: string;
  at: string;
  by: string;
};

type CurationListItem = {
  id: string;
  label: string;
  sectionLabel: string;
};

function toFriendlyStateLabel(state: LeadState): string {
  if (state === "started") return "Started";
  if (state === "working") return "Working";
  return "Completed";
}

function toFriendlyTypeLabel(type: TimelineItem["type"]): string {
  if (type === "state_change") return "State";
  if (type === "checklist_update") return "Checklist";
  if (type === "admin_update") return "Admin";
  return "System";
}

function formatTimelineTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export function HireUsLeadEditor({
  leadId,
  initialStatus,
  initialMessage,
  initialState,
  initialChecklist,
  initialCurationList,
  initialTimeline,
}: {
  leadId: string;
  initialStatus: LeadStatus;
  initialMessage: string;
  initialState: LeadState;
  initialChecklist: ChecklistItem[];
  initialCurationList: CurationListItem[];
  initialTimeline: TimelineItem[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(initialStatus);
  const [message, setMessage] = useState(initialMessage);
  const [state, setState] = useState<LeadState>(initialState);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [customUpdate, setCustomUpdate] = useState("");
  const [saving, setSaving] = useState(false);

  const completedCount = useMemo(
    () => checklist.filter((item) => item.completed).length,
    [checklist]
  );

  const groupedChecklist = useMemo(() => {
    const groups = new Map<string, { label: string; items: ChecklistItem[] }>();

    for (const item of checklist) {
      const key = item.stepKey ?? `fallback:${item.stepLabel ?? "Ungrouped"}`;
      const label = item.stepLabel ?? "Ungrouped";

      const group = groups.get(key);
      if (group) {
        group.items.push(item);
      } else {
        groups.set(key, { label, items: [item] });
      }
    }

    return Array.from(groups.entries()).map(([key, group]) => ({
      key,
      label: group.label,
      items: group.items,
      completed: group.items.filter((item) => item.completed).length,
    }));
  }, [checklist]);

  async function save() {
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          message,
          state,
          checklist,
          customUpdate: customUpdate.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save lead updates");
        return;
      }

      toast.success("Lead updates saved");
      setCustomUpdate("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-6">
        <h2 className="text-base font-semibold text-navy">Manage Hire Us Progress</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-medium-gray">Lead Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LeadStatus)}
              className="mt-2 w-full h-10 rounded-lg border border-border-gray px-3 text-sm"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-medium-gray">Execution State</label>
            <select
              value={state}
              onChange={(event) => setState(event.target.value as LeadState)}
              className="mt-2 w-full h-10 rounded-lg border border-border-gray px-3 text-sm"
            >
              <option value="started">Started</option>
              <option value="working">Working</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wide text-medium-gray">Curation List</label>
            <span className="text-xs text-medium-gray">{initialCurationList.length} items</span>
          </div>
          {initialCurationList.length === 0 ? (
            <p className="mt-2 text-sm text-medium-gray">
              No curation entries found for this lead yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {initialCurationList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border-gray px-3 py-2"
                >
                  <p className="text-sm text-dark-gray">{item.label}</p>
                  <p className="text-xs uppercase tracking-wide text-medium-gray mt-1">
                    {item.sectionLabel}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wide text-medium-gray">Checklist Progress</label>
            <span className="text-xs text-medium-gray">
              {completedCount}/{checklist.length} completed
            </span>
          </div>
          <div className="mt-3 space-y-4">
            {groupedChecklist.map((group) => (
              <div key={group.key} className="rounded-lg border border-border-gray p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-medium-gray">{group.label}</p>
                  <span className="text-xs text-medium-gray">
                    {group.completed}/{group.items.length}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {group.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-border-gray px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(event) => {
                          setChecklist((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, completed: event.target.checked }
                                : entry
                            )
                          );
                        }}
                      />
                      <span className={item.completed ? "text-navy" : "text-medium-gray"}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-medium-gray">Visible Team Message</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mt-2 w-full min-h-[120px] rounded-lg border border-border-gray px-3 py-2 text-sm"
            placeholder="This text appears in the user's Hire Us page."
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-medium-gray">Add Timeline Update</label>
          <textarea
            value={customUpdate}
            onChange={(event) => setCustomUpdate(event.target.value)}
            className="mt-2 w-full min-h-[90px] rounded-lg border border-border-gray px-3 py-2 text-sm"
            placeholder="Write a new update that will appear in the user timeline."
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center h-10 px-4 rounded-lg bg-navy text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Updates"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border-gray p-6">
        <h3 className="text-sm font-semibold text-navy">Activity Timeline</h3>
        {initialTimeline.length === 0 ? (
          <p className="text-sm text-medium-gray mt-3">No timeline entries yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {[...initialTimeline]
              .sort((a, b) => +new Date(b.at) - +new Date(a.at))
              .map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border-gray p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-medium-gray">
                      {toFriendlyTypeLabel(entry.type)}
                    </span>
                    <span className="text-xs text-medium-gray">{formatTimelineTime(entry.at)}</span>
                  </div>
                  <p className="text-sm text-dark-gray mt-2 whitespace-pre-line">{entry.text}</p>
                  <p className="text-xs text-medium-gray mt-1">By {entry.by}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="text-xs text-medium-gray">
        Current state: <span className="font-medium text-dark-gray">{toFriendlyStateLabel(state)}</span>
      </div>
    </div>
  );
}
