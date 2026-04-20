"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type EmailQueueHealth = {
  pending: number;
  retry: number;
  dead: number;
  nextRetryAt: number | null;
};

type EmailQueueInsights = {
  successfulSends: number;
  recentErrors: Array<{
    jobId: string;
    kind: string;
    channel: "transactional" | "support";
    to: string;
    attempts: number;
    status: "retrying" | "failed";
    message: string;
    at: number;
    nextAttemptAt: number | null;
  }>;
  recentActivity: Array<{
    jobId: string;
    kind: string;
    channel: "transactional" | "support";
    to: string;
    attempts: number;
    status: "sent" | "retrying" | "failed";
    subject: string;
    bodyPreview: string | null;
    errorMessage: string | null;
    at: number;
    nextAttemptAt: number | null;
  }>;
};

function formatTimestamp(ms: number | null): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString();
}

export function EmailQueuePanel({ initialHealth, initialInsights }: { initialHealth: EmailQueueHealth; initialInsights: EmailQueueInsights }) {
  const [health, setHealth] = useState<EmailQueueHealth>(initialHealth);
  const [insights, setInsights] = useState<EmailQueueInsights>(initialInsights);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  async function refreshHealth() {
    setIsRefreshing(true);
    const res = await fetch("/api/admin/email-queue", { method: "GET" });
    setIsRefreshing(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Failed to refresh queue health");
      return;
    }

    const payload = (await res.json()) as { health?: EmailQueueHealth; insights?: EmailQueueInsights };
    if (payload.health) {
      setHealth(payload.health);
    }
    if (payload.insights) {
      setInsights(payload.insights);
    }
  }

  async function processNow() {
    setIsProcessing(true);
    const res = await fetch("/api/admin/email-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max: 100 }),
    });
    setIsProcessing(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Failed to process email queue");
      return;
    }

    const payload = (await res.json()) as {
      processed: number;
      sent: number;
      retried: number;
      failed: number;
      health?: EmailQueueHealth;
      insights?: EmailQueueInsights;
    };

    if (payload.health) {
      setHealth(payload.health);
    }
    if (payload.insights) {
      setInsights(payload.insights);
    }

    toast.success(
      `Queue processed: ${payload.processed} checked, ${payload.sent} sent, ${payload.retried} retried, ${payload.failed} failed.`
    );
  }

  async function clearAllQueue() {
    const confirmed = window.confirm("Clear all pending, retry, and dead email queue jobs? This cannot be undone.");
    if (!confirmed) return;

    setIsClearing(true);
    const res = await fetch("/api/admin/email-queue", { method: "DELETE" });
    setIsClearing(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Failed to clear email queue");
      return;
    }

    const payload = (await res.json()) as {
      cleared?: {
        total?: {
          pendingCleared?: number;
          retryCleared?: number;
          deadCleared?: number;
        };
      };
      health?: EmailQueueHealth;
      insights?: EmailQueueInsights;
    };

    if (payload.health) {
      setHealth(payload.health);
    }
    if (payload.insights) {
      setInsights(payload.insights);
    }

    const total = payload.cleared?.total;
    toast.success(
      `Queue cleared: ${total?.pendingCleared ?? 0} pending, ${total?.retryCleared ?? 0} retry, ${total?.deadCleared ?? 0} dead.`
    );
  }

  return (
    <div className="rounded-xl border border-border-gray bg-white p-6 space-y-4">
      <div>
        <p className="font-semibold text-navy">Email Queue Health</p>
        <p className="mt-1 text-sm text-medium-gray">
          Monitor pending/retry/dead jobs and trigger immediate processing for debugging delivery.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">Pending</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{health.pending}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">Retry</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{health.retry}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">Dead</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{health.dead}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">Next Retry</p>
          <p className="mt-1 text-xs font-medium text-gray-900">{formatTimestamp(health.nextRetryAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Successful Sends</p>
          <p className="mt-1 text-base font-semibold text-emerald-900">{insights.successfulSends}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-red-700">Recent Errors</p>
          <p className="mt-1 text-base font-semibold text-red-900">{insights.recentErrors.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={refreshHealth} disabled={isRefreshing || isProcessing || isClearing}>
          {isRefreshing ? "Refreshing..." : "Refresh Queue Health"}
        </Button>
        <Button
          type="button"
          className="bg-navy hover:bg-blue"
          onClick={processNow}
          disabled={isProcessing || isRefreshing || isClearing}
        >
          {isProcessing ? "Processing..." : "Process Queue Now"}
        </Button>
        <Button type="button" variant="destructive" onClick={clearAllQueue} disabled={isClearing || isRefreshing || isProcessing}>
          {isClearing ? "Clearing..." : "Clear All Queue"}
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
        <p className="text-xs uppercase tracking-wide text-gray-600">Email Activity Log</p>
        {insights.recentActivity.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No recent email activity.</p>
        ) : (
          <div className="mt-2 space-y-2 max-h-56 overflow-auto pr-1">
            {insights.recentActivity.map((entry) => (
              <div key={`${entry.jobId}-${entry.status}-${entry.at}`} className="rounded-md border border-gray-200 bg-white px-2 py-2 text-xs">
                <p className="font-medium text-gray-900">
                  [{entry.status}] {entry.kind} to {entry.to}
                </p>
                <p className="mt-1 text-gray-700">Subject: {entry.subject}</p>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap break-words">
                  Body: {entry.bodyPreview ?? "(No text body captured)"}
                </p>
                {entry.errorMessage ? <p className="mt-1 text-red-700 break-words">Error: {entry.errorMessage}</p> : null}
                <p className="mt-1 text-gray-500">
                  Job: {entry.jobId} | Channel: {entry.channel} | Attempts: {entry.attempts} | Time: {formatTimestamp(entry.at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
