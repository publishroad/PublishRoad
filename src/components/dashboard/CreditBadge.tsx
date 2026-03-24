"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface CreditBadgeProps {
  credits: number;
  compact?: boolean;
}

export function CreditBadge({ credits, compact = false }: CreditBadgeProps) {
  const isUnlimited = credits === -1;
  const isLow = !isUnlimited && credits <= 2;
  const isEmpty = !isUnlimited && credits === 0;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
          isEmpty
            ? "bg-red-100 text-error"
            : isLow
            ? "bg-orange-100 text-warning"
            : "bg-light-blue text-blue"
        )}
      >
        {isUnlimited ? "∞" : credits}
        {!isUnlimited && <span>credit{credits === 1 ? "" : "s"}</span>}
      </span>
    );
  }

  return (
    <Link href="/dashboard/billing" className="block">
      <div
        className={cn(
          "rounded-lg p-3 transition-colors",
          isEmpty
            ? "bg-red-900/20 border border-red-500/30"
            : isLow
            ? "bg-orange-900/20 border border-orange-500/30"
            : "bg-white/10 border border-white/20"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-xs font-medium">
            Curations remaining
          </span>
          {isLow && !isEmpty && (
            <span className="text-xs text-warning font-medium">Low</span>
          )}
          {isEmpty && (
            <span className="text-xs text-error font-medium">Empty</span>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={cn(
              "text-2xl font-bold",
              isEmpty
                ? "text-error"
                : isLow
                ? "text-warning"
                : "text-white"
            )}
          >
            {isUnlimited ? "∞" : credits}
          </span>
          {!isUnlimited && (
            <span className="text-white/50 text-xs">
              credit{credits === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {(isEmpty || isLow) && (
          <p className="text-white/50 text-xs mt-1">Click to upgrade →</p>
        )}
      </div>
    </Link>
  );
}
