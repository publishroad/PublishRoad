"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import type { ActivePaymentProvider } from "@/lib/payments/service";
import type { PublicPricingCardProps } from "@/components/public/PublicPricingCard";

const PaymentMethodPicker = dynamic(
  () => import("@/components/public/PaymentMethodPicker").then((mod) => mod.PaymentMethodPicker),
  { ssr: false }
);

export function InteractivePricingCard({
  plan,
  planId,
  currentPlanSlug,
  isAuthenticated,
}: PublicPricingCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerPicker, setProviderPicker] = useState<ActivePaymentProvider[] | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const isCurrent = currentPlanSlug === plan.slug;
  const isFree = plan.slug === "free";
  const isLifetime = plan.slug === "lifetime";

  const PLAN_RANK: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    lifetime: 3,
  };

  const currentRank = currentPlanSlug ? PLAN_RANK[currentPlanSlug] : undefined;
  const nextRank = PLAN_RANK[plan.slug];
  const isDowngrade =
    typeof currentRank === "number" &&
    typeof nextRank === "number" &&
    nextRank < currentRank;

  const prettyPlanName =
    currentPlanSlug === "free"
      ? "Free"
      : currentPlanSlug === "starter"
      ? "Starter"
      : currentPlanSlug === "pro"
      ? "Pro"
      : currentPlanSlug === "lifetime"
      ? "Lifetime"
      : currentPlanSlug ?? "current plan";

  const ctaLabel = isCurrent ? "Current Plan" : isSubmitting ? "Loading..." : plan.cta;

  async function resolveIsAuthenticated() {
    if (typeof isAuthenticated === "boolean") {
      return isAuthenticated;
    }

    try {
      const res = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = res.ok ? await res.json().catch(() => null) : null;
      return Boolean(payload?.user);
    } catch {
      return false;
    }
  }

  async function handleCheckout() {
    if (isCurrent || isSubmitting || !planId) return;

    if (isDowngrade) {
      const confirmed = window.confirm(
        `You are about to downgrade from ${prettyPlanName} to ${plan.name}. This can reduce your access and credits. Continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    const authed = await resolveIsAuthenticated();

    if (!authed) {
      window.location.href = isFree ? "/signup" : `/signup?plan=${plan.slug}`;
      return;
    }

    if (isFree) {
      try {
        const res = await fetch("/api/payments/downgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPlanSlug: "free" }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(payload?.error ?? "Failed to apply downgrade");
        }
        window.location.href = "/dashboard/billing";
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to apply downgrade");
      }
      return;
    }

    await startCheckout(planId);
  }

  async function startCheckout(pid: string, provider?: ActivePaymentProvider) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: pid, provider, successPath: "/dashboard", cancelPath: "/pricing" }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to start checkout");
      }
      if (payload?.selectProvider) {
        setPendingPlanId(pid);
        setProviderPicker(payload.selectProvider as ActivePaymentProvider[]);
        setIsSubmitting(false);
        return;
      }
      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }
      if (payload?.razorpay) {
        const { openRazorpayCheckout } = await import("@/lib/razorpay-checkout");
        await openRazorpayCheckout(payload.razorpay).catch(() => setIsSubmitting(false));
        return;
      }
      throw new Error("Invalid checkout response");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setIsSubmitting(false);
    }
  }

  const ctaStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "center",
    borderRadius: "999px",
    padding: "11px 20px",
    fontWeight: 600,
    fontSize: "0.875rem",
    textDecoration: "none",
    transition: "all 0.2s",
    border: "none",
    cursor: isCurrent ? "default" : isSubmitting ? "not-allowed" : "pointer",
    opacity: isSubmitting ? 0.8 : 1,
    ...(isCurrent
      ? { background: "#f1f5f9", color: "#94a3b8" }
      : plan.popular
      ? { background: "#5B58F6", color: "#ffffff", boxShadow: "0 0 20px rgba(91,88,246,0.5)" }
      : isLifetime
      ? { background: "#7c3aed", color: "#ffffff" }
      : { background: "#020617", color: "#ffffff" }),
  };

  return (
    <>
      {providerPicker && pendingPlanId && (
        <PaymentMethodPicker
          providers={providerPicker}
          onSelect={(p) => {
            setProviderPicker(null);
            void startCheckout(pendingPlanId, p);
          }}
          onCancel={() => {
            setProviderPicker(null);
            setPendingPlanId(null);
          }}
        />
      )}
      <button className="pricing-scroll-btn" type="button" onClick={() => void handleCheckout()} disabled={isCurrent || isSubmitting} style={ctaStyle}>
        {ctaLabel}
      </button>
    </>
  );
}
