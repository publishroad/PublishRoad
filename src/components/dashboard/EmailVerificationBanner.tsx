"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const COOLDOWN_SECONDS = 60;

function getDismissKey(userId: string | undefined): string {
  return `email-verification-banner:dismissed:${userId ?? "unknown"}`;
}

export function EmailVerificationBanner({
  initialUserId,
  initialIsEmailVerified,
}: {
  initialUserId?: string;
  initialIsEmailVerified?: boolean;
}) {
  const { data: session, update } = useSession();
  const userId = session?.user?.id ?? initialUserId;
  const isVerified = session?.user?.isEmailVerified ?? initialIsEmailVerified ?? false;

  const dismissKey = useMemo(() => getDismissKey(userId), [userId]);

  const [hidden, setHidden] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isVerified) {
      sessionStorage.removeItem(dismissKey);
      setHidden(false);
      return;
    }

    setHidden(sessionStorage.getItem(dismissKey) === "1");
  }, [dismissKey, isVerified]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  if (isVerified || hidden) {
    return null;
  }

  async function resendVerificationEmail() {
    if (isSending || cooldownLeft > 0) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/auth/resend-verification-email", {
        method: "POST",
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Could not resend verification email. Please try again.";
        toast.error(message);
        return;
      }

      setCooldownLeft(COOLDOWN_SECONDS);

      if (payload.alreadyVerified) {
        toast.success("Your email is already verified.");
        await update();
        return;
      }

      toast.success("Verification email sent. Please check your inbox.");
    } finally {
      setIsSending(false);
    }
  }

  function dismissBanner() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(dismissKey, "1");
    }
    setHidden(true);
  }

  async function refreshVerificationStatus() {
    const updated = await update();
    if (!(updated?.user?.isEmailVerified ?? false)) {
      toast.message("Still unverified. Please open the email verification link first.");
    }
  }

  return (
    <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm font-medium">
          Please verify your email to secure your account and unlock full dashboard access.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshVerificationStatus}
            className="h-8 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Verify Now
          </button>
          <button
            type="button"
            onClick={resendVerificationEmail}
            disabled={isSending || cooldownLeft > 0}
            className="h-8 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSending
              ? "Sending..."
              : cooldownLeft > 0
              ? `Resend in ${cooldownLeft}s`
              : "Resend Email"}
          </button>
          <button
            type="button"
            aria-label="Dismiss email verification reminder"
            onClick={dismissBanner}
            className="h-8 w-8 rounded-lg border border-amber-300 bg-white text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            x
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-amber-800">
        Tip: check spam/promotions if you do not see it. You can also open <Link href="/verify-email" className="underline">verify page</Link> after clicking the email link.
      </p>
    </div>
  );
}
