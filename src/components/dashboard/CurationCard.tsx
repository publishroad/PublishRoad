"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

interface CurationCardProps {
  id: string;
  productUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date | string;
  resultCount?: number;
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
  resultCount,
}: CurationCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const config = statusConfig[status];

  // Truncate long URLs for display
  let displayUrl = productUrl;
  try {
    const parsed = new URL(productUrl);
    displayUrl = parsed.hostname + parsed.pathname.replace(/\/$/, "");
  } catch {
    // Keep original
  }

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isDeleting) return;

    if (status !== "failed") {
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
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete curation";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
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
            {status === "completed" && resultCount !== undefined && (
              <span className="text-xs text-slate-400">{resultCount} sites</span>
            )}
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label="Delete curation"
        title="Delete curation"
        onClick={handleDelete}
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
}
