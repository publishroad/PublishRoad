import dynamic from "next/dynamic";
import Link from "next/link";
import type { PlanDisplay } from "@/lib/pricing-plans";

const InteractivePricingCard = dynamic(
  () => import("@/components/public/InteractivePricingCard").then((mod) => mod.InteractivePricingCard)
);

export interface PublicPricingCardProps {
  plan: PlanDisplay;
  planId?: string;
  currentPlanSlug?: string;
  isAuthenticated?: boolean;
}

export function PublicPricingCard(props: PublicPricingCardProps) {
  const { plan, planId } = props;

  const isFree = plan.slug === "free";
  const isLifetime = plan.slug === "lifetime";

  const cardStyle: React.CSSProperties = {
    position: "relative",
    borderRadius: "2rem",
    padding: "1.75rem",
    display: "flex",
    flexDirection: "column",
    ...(plan.popular
      ? { background: "#020617", boxShadow: "0 12px 48px rgba(91,88,246,0.3)" }
      : { background: "#ffffff", border: "1px solid rgba(226,232,240,0.9)", boxShadow: "0 4px 20px rgba(91,88,246,0.06)" }),
  };

  const ctaStyle: React.CSSProperties = {
    display: "block",
    textAlign: "center",
    borderRadius: "999px",
    padding: "11px 20px",
    fontWeight: 600,
    fontSize: "0.875rem",
    textDecoration: "none",
    transition: "all 0.2s",
    border: "none",
    cursor: "pointer",
    ...(plan.popular
      ? { background: "#5B58F6", color: "#ffffff", boxShadow: "0 0 20px rgba(91,88,246,0.5)" }
      : isLifetime
      ? { background: "#7c3aed", color: "#ffffff" }
      : { background: "#020617", color: "#ffffff" }),
  };

  return (
    <div className="js-scroll-reveal pricing-card-scroll" style={cardStyle}>
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

      <p style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "1rem", color: plan.popular ? "#ffffff" : "#020617", marginBottom: "0.5rem" }}>
        {plan.name}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
        {plan.actualPrice && (
          <span
            style={{
              fontSize: "1rem",
              color: plan.popular ? "#94a3b8" : "#94a3b8",
              textDecoration: "line-through",
              marginRight: "6px",
            }}
          >
            {plan.actualPrice}
            {plan.period}
          </span>
        )}
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "2.25rem", fontWeight: 700, color: plan.popular ? "#ffffff" : "#020617", lineHeight: 1 }}>
          {plan.offerPrice}
        </span>
        {plan.period && (
          <span style={{ fontSize: "0.875rem", color: "#94a3b8", fontWeight: 300 }}>
            {plan.period}
          </span>
        )}
      </div>

      {plan.savingsLabel && (
        <p style={{ fontSize: "0.75rem", color: plan.popular ? "#a5b4fc" : "#5B58F6", fontWeight: 600, marginBottom: "0.35rem" }}>
          {plan.savingsLabel}
        </p>
      )}

      <p style={{ fontSize: "0.75rem", color: plan.popular ? "#64748b" : "#94a3b8", fontWeight: 300, marginBottom: "0.75rem" }}>
        {plan.billingNote}
      </p>

      <div style={{ background: plan.popular ? "rgba(91,88,246,0.25)" : "rgba(91,88,246,0.08)", borderRadius: "0.75rem", padding: "6px 12px", marginBottom: "1.25rem", display: "inline-block" }}>
        <span style={{ color: plan.popular ? "#a5b4fc" : "#5B58F6", fontSize: "0.78rem", fontWeight: 600 }}>
          {plan.credits}
        </span>
      </div>

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

      {planId ? (
        <InteractivePricingCard {...props} />
      ) : (
        <Link className="pricing-scroll-btn" href={isFree ? "/signup" : `/signup?plan=${plan.slug}`} style={ctaStyle}>
          {plan.cta}
        </Link>
      )}
    </div>
  );
}
