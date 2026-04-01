"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface NavbarClientProps {
  navLinks: Array<{ href: string; label: string }>;
}

export function NavbarClient({ navLinks }: NavbarClientProps) {
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (active) {
          setIsAuthenticated(Boolean(payload?.user));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const primaryCta = isAuthenticated ? (
    <Link
      href="/dashboard"
      className="rounded-full bg-[var(--indigo)] px-5 py-2 text-sm font-medium text-white shadow-[0_0_16px_rgba(91,88,246,0.35)]"
    >
      Dashboard
    </Link>
  ) : (
    <>
      <Link
        href="/login"
        className="rounded-full px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="rounded-full bg-[var(--indigo)] px-5 py-2 text-sm font-medium text-white shadow-[0_0_16px_rgba(91,88,246,0.35)]"
      >
        Get Started Free
      </Link>
    </>
  );

  return (
    <>
      <div className="hidden lg:flex items-center gap-3">{primaryCta}</div>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-full p-2 text-slate-600 transition-colors hover:bg-white/60"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-white/40 bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <Image src="/logo.png" alt="PublishRoad" width={120} height={34} sizes="120px" style={{ height: "auto" }} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="rounded-full px-4 py-2.5 text-base font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[var(--indigo)] px-5 py-2.5 text-center text-sm font-medium text-white shadow-[0_0_16px_rgba(91,88,246,0.35)]"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-center text-sm font-medium text-slate-600"
                    onClick={() => setOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-[var(--indigo)] px-5 py-2.5 text-center text-sm font-medium text-white shadow-[0_0_16px_rgba(91,88,246,0.35)]"
                    onClick={() => setOpen(false)}
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
