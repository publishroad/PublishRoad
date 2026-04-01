"use client";

import dynamic from "next/dynamic";

const DeferredToaster = dynamic(
  () => import("sonner").then((mod) => mod.Toaster),
  { ssr: false }
);

const DeferredCookieConsent = dynamic(
  () => import("@/components/CookieConsent").then((mod) => mod.CookieConsent),
  { ssr: false }
);

const DeferredPostHogProvider = dynamic(
  () => import("@/components/PostHogProvider").then((mod) => mod.PostHogProvider),
  { ssr: false }
);

export function GlobalUiEnhancements() {
  return (
    <>
      <DeferredToaster position="top-right" richColors />
      <DeferredPostHogProvider />
      <DeferredCookieConsent />
    </>
  );
}
