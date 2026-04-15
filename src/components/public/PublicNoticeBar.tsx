"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SiteNoticeConfig } from "@/lib/site-notice-config-shared";

const NOTICE_SESSION_KEY = "publishroad_public_notice_hidden";

export function PublicNoticeBar({ config }: { config: SiteNoticeConfig }) {
  const [hidden, setHidden] = useState(false);

  const isRenderable = useMemo(() => {
    return config.enabled && !!config.message && !!config.ctaLabel && !!config.ctaUrl;
  }, [config.enabled, config.message, config.ctaLabel, config.ctaUrl]);

  useEffect(() => {
    if (!isRenderable) return;
    const hiddenInSession = sessionStorage.getItem(NOTICE_SESSION_KEY) === "1";
    if (hiddenInSession) {
      setHidden(true);
    }
  }, [isRenderable]);

  if (!isRenderable || hidden) {
    return null;
  }

  return (
    <div
      className="relative w-full overflow-hidden border-b"
      style={{
        backgroundColor: "var(--dark)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-[420px]"
        style={{
          background: "radial-gradient(ellipse, rgba(91,88,246,0.22) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="relative mx-auto flex h-12 max-w-[1440px] items-center justify-center px-4 sm:px-6">
        <div className="flex max-w-[calc(100%-2.5rem)] flex-wrap items-center justify-center gap-2 text-center sm:gap-3">
          <p className="text-sm font-light text-slate-200">{config.message}</p>
          <Link
            href={config.ctaUrl}
            className="inline-flex h-7 items-center rounded-md border border-indigo-300/60 px-3 text-xs font-semibold text-indigo-200 transition-colors hover:bg-white/5 hover:text-indigo-100"
          >
            {config.ctaLabel}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(NOTICE_SESSION_KEY, "1");
            setHidden(true);
          }}
          className="absolute right-4 inline-flex h-7 w-7 items-center justify-center rounded-md text-indigo-200 transition-colors hover:bg-white/10 hover:text-indigo-100 sm:right-6"
          aria-label="Close notice"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
