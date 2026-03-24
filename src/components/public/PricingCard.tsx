"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

interface PricingCardProps {
  planId: string;
  name: string;
  slug: string;
  priceCents: number;
  billingType: "free" | "one_time" | "monthly" | "lifetime";
  credits: number;
  features: string[];
  isPopular?: boolean;
  currentPlanSlug?: string;
  isAuthenticated?: boolean;
}

export function PricingCard({
  planId,
  name,
  slug,
  priceCents,
  billingType,
  credits,
  features,
  isPopular,
  currentPlanSlug,
  isAuthenticated = false,
}: PricingCardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCurrent = currentPlanSlug === slug;
  const isFree = slug === "free" || priceCents === 0;

  const priceLabel =
    priceCents === 0
      ? "Free"
      : billingType === "monthly"
      ? `${formatCurrency(priceCents)}/mo`
      : formatCurrency(priceCents);

  const billingLabel =
    billingType === "monthly"
      ? "Billed monthly"
      : billingType === "one_time"
      ? "One-time payment"
      : billingType === "lifetime"
      ? "One-time, lifetime access"
      : null;

  const creditLabel =
    credits === -1
      ? "Unlimited curations"
      : credits === 1
      ? "1 curation"
      : `${credits} curations/month`;

  const ctaLabel = isCurrent
    ? "Current Plan"
    : isSubmitting
    ? "Loading..."
    : isFree
    ? "Get Started Free"
    : isAuthenticated
    ? `Upgrade to ${name}`
    : `Get ${name}`;

  const isLifetime = slug === "lifetime";

  async function handleCheckout() {
    if (isCurrent || isSubmitting) return;

    if (!isAuthenticated) {
      router.push(isFree ? "/signup" : `/signup?plan=${slug}`);
      return;
    }

    if (isFree) {
      router.push("/dashboard");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Failed to start checkout");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "relative bg-white rounded-[2rem] p-6 flex flex-col transition-all duration-300 hover:shadow-xl",
        isPopular
          ? "ring-2"
          : ""
      )}
      style={{
        boxShadow: isPopular
          ? "0 8px 40px rgba(91, 88, 246, 0.15)"
          : "0 4px 24px rgba(91, 88, 246, 0.06)",
        border: isPopular
          ? "none"
          : "1px solid rgba(226, 232, 240, 0.8)",
        ...(isPopular ? { outline: "2px solid var(--indigo)", outlineOffset: "-2px" } : {}),
      }}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--indigo)" }}
          >
            Most Popular
          </span>
        </div>
      )}

      {isLifetime && !isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--purple)" }}
          >
            Best Value
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3
          className="text-base font-semibold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
        >
          {name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-bold"
            style={{ color: "var(--dark)", fontFamily: "var(--font-heading)" }}
          >
            {priceLabel}
          </span>
        </div>
        {billingLabel && (
          <p className="text-xs text-slate-400 mt-1 font-light">{billingLabel}</p>
        )}
        <div
          className="mt-3 px-3 py-2 rounded-xl"
          style={{ backgroundColor: "var(--indigo-light)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--indigo)" }}>
            {creditLabel}
          </span>
        </div>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 font-light">
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: "var(--success)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <span
          style={{
            display: "block", width: "100%", borderRadius: "999px",
            padding: "10px 20px", textAlign: "center", textDecoration: "none",
            fontWeight: 600, fontSize: "0.875rem", transition: "all 0.2s",
            background: "#f1f5f9", color: "#94a3b8", cursor: "default", pointerEvents: "none",
          }}
        >
          {ctaLabel}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isSubmitting}
          style={{
            display: "block", width: "100%", borderRadius: "999px",
            padding: "10px 20px", textAlign: "center", textDecoration: "none",
            fontWeight: 600, fontSize: "0.875rem", transition: "all 0.2s",
            border: "none", cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.8 : 1,
            ...(isPopular
              ? { background: "#5B58F6", color: "#ffffff", boxShadow: "0 0 20px rgba(91,88,246,0.35)" }
              : isLifetime
              ? { background: "#7c3aed", color: "#ffffff" }
              : { background: "#020617", color: "#ffffff" }),
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
