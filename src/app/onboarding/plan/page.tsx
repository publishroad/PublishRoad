"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  billingType: string;
  credits: number;
  features: string[];
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: "plan_free",
    name: "Free",
    slug: "free",
    priceCents: 0,
    billingType: "free",
    credits: 1,
    features: ["1 curation", "5 results shown", "All 3 sections", "Basic filtering"],
  },
  {
    id: "plan_starter",
    name: "Starter",
    slug: "starter",
    priceCents: 900,
    billingType: "one_time",
    credits: 1,
    features: ["1 full curation", "50+ results", "All 3 sections", "Export results"],
  },
  {
    id: "plan_pro",
    name: "Pro",
    slug: "pro",
    priceCents: 3900,
    billingType: "monthly",
    credits: 10,
    features: ["10 curations/month", "50+ results each", "Priority AI matching", "Export results", "Email notifications"],
  },
  {
    id: "plan_lifetime",
    name: "Lifetime",
    slug: "lifetime",
    priceCents: 59900,
    billingType: "one_time",
    credits: -1,
    features: ["Unlimited curations", "50+ results each", "Priority AI matching", "All future features", "Priority support"],
  },
];

export default function OnboardingPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lookup/plans", { cache: "force-cache" }).then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) setPlans(data);
      }
    }).catch(() => {});
  }, []);

  async function selectPlan(plan: Plan) {
    if (loading) return;
    setLoading(plan.id);

    if (plan.slug === "free" || plan.priceCents === 0) {
      router.push("/onboarding/curation");
      return;
    }

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start checkout");
        setLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="px-4 pb-20">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-12 mt-4">
        {["Plan", "Details", "Processing"].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                style={
                  i === 0
                    ? { backgroundColor: "var(--indigo)", color: "#fff" }
                    : { backgroundColor: "rgba(91,88,246,0.12)", color: "var(--indigo)" }
                }
              >
                {i + 1}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: i === 0 ? "var(--dark)" : "#94a3b8" }}
              >
                {step}
              </span>
            </div>
            {i < 2 && (
              <div className="w-8 h-px" style={{ backgroundColor: "#e2e8f0" }} />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-12">
        <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
          Step 1
        </p>
        <h1
          className="text-4xl sm:text-5xl font-bold mb-4"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
        >
          Choose your plan
        </h1>
        <p className="text-slate-500 font-light max-w-md mx-auto">
          Start free to test quality, or go paid for full access. No credit card required for free.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isFree = plan.priceCents === 0;
          const isPro = plan.slug === "pro";
          const isLifetime = plan.slug === "lifetime";
          const isLoading = loading === plan.id;

          const priceLabel = isFree
            ? "Free"
            : plan.billingType === "monthly"
            ? `${formatCurrency(plan.priceCents)}/mo`
            : formatCurrency(plan.priceCents);

          const creditLabel =
            plan.credits === -1
              ? "Unlimited curations"
              : plan.credits === 1
              ? "1 curation"
              : `${plan.credits} curations/month`;

          return (
            <div
              key={plan.id}
              className="relative bg-white rounded-[2rem] p-6 flex flex-col transition-all duration-300"
              style={{
                boxShadow: isPro
                  ? "0 8px 40px rgba(91,88,246,0.15)"
                  : "0 4px 24px rgba(91,88,246,0.06)",
                border: isPro ? "none" : "1px solid rgba(226,232,240,0.8)",
                ...(isPro ? { outline: "2px solid var(--indigo)", outlineOffset: "-2px" } : {}),
              }}
            >
              {isPro && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: "var(--indigo)" }}
                  >
                    Most Popular
                  </span>
                </div>
              )}
              {isLifetime && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: "#7c3aed" }}
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
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: "var(--dark)", fontFamily: "var(--font-heading)" }}
                  >
                    {priceLabel}
                  </span>
                </div>
                {plan.billingType === "monthly" && (
                  <p className="text-xs text-slate-400 mt-1 font-light">Billed monthly</p>
                )}
                {plan.billingType === "one_time" && plan.priceCents > 0 && (
                  <p className="text-xs text-slate-400 mt-1 font-light">One-time payment</p>
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
                {(plan.features as string[]).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 font-light">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => selectPlan(plan)}
                disabled={!!loading}
                style={{
                  display: "block", width: "100%", borderRadius: "999px",
                  padding: "10px 20px", textAlign: "center",
                  fontWeight: 600, fontSize: "0.875rem", transition: "all 0.2s",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading && !isLoading ? 0.6 : 1,
                  ...(isPro
                    ? { background: "#5B58F6", color: "#fff", boxShadow: "0 0 20px rgba(91,88,246,0.35)" }
                    : isLifetime
                    ? { background: "#7c3aed", color: "#fff" }
                    : isFree
                    ? { background: "#020617", color: "#fff" }
                    : { background: "#020617", color: "#fff" }),
                }}
              >
                {isLoading
                  ? "Loading..."
                  : isFree
                  ? "Start Free →"
                  : `Get ${plan.name} →`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8 font-light">
        No refunds on paid plans. Try free first to verify quality.
      </p>
    </div>
  );
}
