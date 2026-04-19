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

function formatTimestamp(ms: number | null): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString();
}

export function EmailQueuePanel({ initialHealth }: { initialHealth: EmailQueueHealth }) {
  const [health, setHealth] = useState<EmailQueueHealth>(initialHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  async function refreshHealth() {
    setIsRefreshing(true);
    const res = await fetch("/api/admin/email-queue", { method: "GET" });
    setIsRefreshing(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Failed to refresh queue health");
      return;
    }

    const payload = (await res.json()) as { health?: EmailQueueHealth };
    if (payload.health) {
      setHealth(payload.health);
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
    };

    if (payload.health) {
      setHealth(payload.health);
    }

    toast.success(
      `Queue processed: ${payload.processed} checked, ${payload.sent} sent, ${payload.retried} retried, ${payload.failed} failed.`
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

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={refreshHealth} disabled={isRefreshing || isProcessing}>
          {isRefreshing ? "Refreshing..." : "Refresh Queue Health"}
        </Button>
        <Button type="button" className="bg-navy hover:bg-blue" onClick={processNow} disabled={isProcessing || isRefreshing}>
          {isProcessing ? "Processing..." : "Process Queue Now"}
        </Button>
      </div>
    </div>
  );
}
