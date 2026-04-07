"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PRICING_PLANS, dbPlanToDisplay, type PlanDisplay } from "@/lib/pricing-plans";
import type { ActivePaymentProvider } from "@/lib/payments/service";
import { PaymentMethodPicker } from "@/components/public/PaymentMethodPicker";

export default function OnboardingPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanDisplay[]>(PRICING_PLANS);
  const [planIds, setPlanIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [providerPicker, setProviderPicker] = useState<ActivePaymentProvider[] | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lookup/plans", { cache: "no-store" }).then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) {
          setPlans(data.map(dbPlanToDisplay));
          const map: Record<string, string> = {};
          (data as { id: string; slug: string }[]).forEach((p) => { map[p.slug] = p.id; });
          setPlanIds(map);
        }
      }
    }).catch(() => {});
  }, []);

  async function selectPlan(slug: string) {
    if (loading) return;
    setLoading(slug);
    if (slug === "free") { router.push("/onboarding/curation"); return; }
    const planId = planIds[slug];
    if (!planId) { toast.error("Plan not found. Please refresh and try again."); setLoading(null); return; }
    await startCheckout(planId);
  }

  async function startCheckout(planId: string, provider?: ActivePaymentProvider) {
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, provider }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to start checkout"); setLoading(null); return; }
      if (data.selectProvider) {
        setPendingPlanId(planId);
        setProviderPicker(data.selectProvider as ActivePaymentProvider[]);
        setLoading(null);
        return;
      }
      if (data.url) { window.location.href = data.url; return; }
      if (data.razorpay) {
        const { openRazorpayCheckout } = await import("@/lib/razorpay-checkout");
        await openRazorpayCheckout(data.razorpay).catch(() => setLoading(null));
        return;
      }
      toast.error("Unexpected checkout response. Please try again.");
      setLoading(null);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <>
    {providerPicker && pendingPlanId && (
      <PaymentMethodPicker
        providers={providerPicker}
        onSelect={(p) => { setProviderPicker(null); startCheckout(pendingPlanId, p); }}
        onCancel={() => { setProviderPicker(null); setPendingPlanId(null); }}
      />
    )}
    <div className="px-4 pb-20">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-12 mt-4">
        {["Plan", "Details", "Processing"].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
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
              <span className="text-sm font-medium" style={{ color: i === 0 ? "var(--dark)" : "#94a3b8" }}>
                {step}
              </span>
            </div>
            {i < 2 && <div className="w-8 h-px" style={{ backgroundColor: "#e2e8f0" }} />}
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
          const isFree = plan.slug === "free";
          const isLifetime = plan.slug === "lifetime";
          const isLoading = loading === plan.slug;

          const cardStyle: React.CSSProperties = {
            position: "relative",
            borderRadius: "2rem",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s",
            ...(plan.popular
              ? { background: "#020617", boxShadow: "0 12px 48px rgba(91,88,246,0.3)" }
              : { background: "#ffffff", border: "1px solid rgba(226,232,240,0.9)", boxShadow: "0 4px 20px rgba(91,88,246,0.06)" }),
          };

          const ctaStyle: React.CSSProperties = {
            display: "block",
            width: "100%",
            borderRadius: "999px",
            padding: "11px 20px",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "0.875rem",
            transition: "all 0.2s",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading && !isLoading ? 0.6 : 1,
            ...(plan.popular
              ? { background: "#5B58F6", color: "#ffffff", boxShadow: "0 0 20px rgba(91,88,246,0.5)" }
              : isLifetime
              ? { background: "#7c3aed", color: "#ffffff" }
              : { background: "#020617", color: "#ffffff" }),
          };

          return (
            <div key={plan.slug} style={cardStyle}>
              {/* Badge */}
              {plan.popular && (
                <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)" }}>
                  <span style={{ background: "#5B58F6", color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "5px 14px", borderRadius: "999px", display: "inline-block" }}>
                    Most Popular
                  </span>
                </div>
              )}
              {plan.badge && !plan.popular && (
                <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)" }}>
                  <span style={{ background: "#7c3aed", color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "5px 14px", borderRadius: "999px", display: "inline-block" }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <p style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "1rem", color: plan.popular ? "#ffffff" : "#020617", marginBottom: "0.5rem" }}>
                {plan.name}
              </p>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "2.25rem", fontWeight: 700, color: plan.popular ? "#ffffff" : "#020617", lineHeight: 1 }}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span style={{ fontSize: "0.875rem", color: "#94a3b8", fontWeight: 300 }}>
                    {plan.period}
                  </span>
                )}
              </div>

              {/* Billing note */}
              <p style={{ fontSize: "0.75rem", color: plan.popular ? "#64748b" : "#94a3b8", fontWeight: 300, marginBottom: "0.75rem" }}>
                {plan.billingNote}
              </p>

              {/* Credits pill */}
              <div style={{ background: plan.popular ? "rgba(91,88,246,0.25)" : "rgba(91,88,246,0.08)", borderRadius: "0.75rem", padding: "6px 12px", marginBottom: "1.25rem", display: "inline-block" }}>
                <span style={{ color: plan.popular ? "#a5b4fc" : "#5B58F6", fontSize: "0.78rem", fontWeight: 600 }}>
                  {plan.credits}
                </span>
              </div>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem 0", flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.82rem", color: plan.popular ? "#cbd5e1" : "#64748b", fontWeight: 300 }}>
                    <svg width="14" height="14" style={{ marginTop: "2px", flexShrink: 0, color: plan.popular ? "#a5b4fc" : "#27AE60" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => selectPlan(plan.slug)}
                disabled={!!loading}
                style={ctaStyle}
              >
                {isLoading ? "Loading..." : isFree ? "Start Free →" : `${plan.cta} →`}
              </button>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <p className="text-center text-sm text-slate-500 mt-8">
          No plans are currently available.
        </p>
      )}

      <p className="text-center text-xs text-slate-400 mt-8 font-light">
        No refunds on paid plans. Try free first to verify quality.
      </p>
    </div>
    </>
  );
}
