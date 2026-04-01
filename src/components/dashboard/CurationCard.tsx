"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";

type SectionKey = "a" | "b" | "c";
type ProgressBySection = Record<SectionKey, { total: number; completed: number }>;

const sectionLabels: Record<SectionKey, string> = {
  a: "Distribution Sites",
  b: "Guest Post & Backlinks",
  c: "Press Release Sites",
};

const sectionSteps: Record<SectionKey, string> = {
  a: "Step 1",
  b: "Step 2",
  c: "Step 3",
};

interface CurationCardProps {
  id: string;
  productUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date | string;
  progress?: ProgressBySection;
}

const statusConfig = {
  pending: { label: "Pending", className: "bg-gray-100 text-medium-gray" },
  processing: { label: "Processing...", className: "bg-blue-100 text-blue animate-pulse" },
  completed: { label: "Completed", className: "bg-green-100 text-success" },
  failed: { label: "Failed", className: "bg-red-100 text-error" },
};

export function CurationCard({
  id,
  productUrl,
  status,
  createdAt,
  progress,
}: CurationCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const config = statusConfig[status];
  const safeProgress: ProgressBySection = progress ?? {
    a: { total: 0, completed: 0 },
    b: { total: 0, completed: 0 },
    c: { total: 0, completed: 0 },
  };

  // Truncate long URLs for display
  let displayUrl = productUrl;
  try {
    const parsed = new URL(productUrl);
    displayUrl = parsed.hostname + parsed.pathname.replace(/\/$/, "");
  } catch {
    // Keep original
  }

  async function runDelete() {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/curations/${id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to delete curation");
      }

      toast.success(
        payload?.refundedCredit
          ? "Curation deleted and credit restored"
          : "Curation deleted successfully"
      );
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete curation";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isDeleting) return;

    if (status !== "failed") {
      setIsDeleteDialogOpen(true);
      return;
    }

    await runDelete();
  }

  const cardContent =
    status === "completed" ? (
      <CompletedCurationCard
        id={id}
        progress={safeProgress}
        createdAt={createdAt}
        displayUrl={displayUrl}
        isDeleting={isDeleting}
        onDelete={(event) => {
          void handleDelete(event);
        }}
      />
    ) : (
      <div
        className="relative bg-white rounded-2xl p-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
        style={{
          boxShadow: "0 2px 12px rgba(91,88,246,0.05)",
          border: "1px solid rgba(226,232,240,0.8)",
        }}
      >
        <Link
          href={`/dashboard/curations/${id}`}
          className="block pr-12"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p
                className="font-medium truncate text-sm"
                style={{ color: "var(--dark)" }}
              >
                {displayUrl}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-light">
                {formatRelativeTime(createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={`text-xs ${config.className} border-0`}>
                {config.label}
              </Badge>
            </div>
          </div>
        </Link>

        <button
          type="button"
          aria-label="Delete curation"
          title="Delete curation"
          onClick={(event) => {
            void handleDelete(event);
          }}
          disabled={isDeleting}
          className="absolute top-3 right-3 h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isDeleting ? (
            <span className="text-[10px]">...</span>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
            </svg>
          )}
        </button>
      </div>
    );

  return (
    <>
      {cardContent}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => {
          void runDelete();
        }}
      />
    </>
  );
}

function CompletedCurationCard({
  id,
  progress,
  createdAt,
  displayUrl,
  isDeleting,
  onDelete,
}: {
  id: string;
  progress: ProgressBySection;
  createdAt: Date | string;
  displayUrl: string;
  isDeleting: boolean;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const totalTasks = progress.a.total + progress.b.total + progress.c.total;
  const totalCompleted = progress.a.completed + progress.b.completed + progress.c.completed;
  const totalPercent = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

  const motivationText =
    totalPercent >= 100
      ? "Outstanding execution. You completed every task and unlocked your strongest publishing momentum."
      : totalPercent >= 70
      ? "You are close to a full campaign rollout. Finish the remaining tasks to maximize authority, links, and visibility."
      : totalPercent >= 35
      ? "Great momentum. Keep pushing and your reach, trust signals, and referral traffic can compound quickly."
      : "Every completed task builds brand authority and search presence. Start with one step now and stack consistent wins.";

  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-[#dbe4ff] bg-[linear-gradient(130deg,#f8fbff_0%,#eef3ff_45%,#ffffff_100%)] p-4 shadow-[0_10px_35px_rgba(70,95,255,0.08)] sm:rounded-[28px] sm:p-6"
    >
      <Link href={`/dashboard/curations/${id}`} className="block">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#465FFF]">Campaign Progress</p>
            <h3 className="mt-2 break-words text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{displayUrl}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{motivationText}</p>
            <p className="mt-2 text-xs text-slate-400">{displayUrl} · {formatRelativeTime(createdAt)}</p>
          </div>

          <div className="w-full rounded-3xl border border-[#cfd9ff] bg-white/95 p-4 shadow-[0_10px_30px_rgba(70,95,255,0.12)] sm:w-auto sm:min-w-[230px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total Completion</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{totalPercent}%</p>
            <p className="text-sm text-slate-600">{totalCompleted} of {totalTasks} tasks done</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#465FFF_0%,#7C8DFF_100%)] transition-all"
                style={{ width: `${totalPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(["a", "b", "c"] as const).map((section) => {
            const total = progress[section].total;
            const completed = progress[section].completed;
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

            return (
              <div key={section} className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3">
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
      </Link>

      <button
        type="button"
        aria-label="Delete curation"
        title="Delete curation"
        onClick={onDelete}
        disabled={isDeleting}
        className="absolute right-3 top-3 h-9 w-9 rounded-xl border border-red-200 bg-white/90 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center sm:right-4 sm:top-4"
      >
        {isDeleting ? (
          <span className="text-[10px]">...</span>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
          </svg>
        )}
      </button>
    </div>
  );
}

function DeleteConfirmationDialog({
  open,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-slate-200 bg-white p-0" showCloseButton={false}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold text-slate-950">Delete this curation?</DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-6 text-slate-600">
            This action is permanent. Once deleted, your curation data cannot be recovered and your credit will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="rounded-b-xl border-slate-200 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Curation"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
