import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PublishRoad — Launch Your Product to the Right Places",
  description:
    "AI-powered distribution plans for product launches. Get curated lists of the best sites to submit your product, get backlinks, and get press coverage.",
};

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(91,88,246,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(124,58,237,0.07) 0%, transparent 60%), #FAFAFA",
          paddingTop: "7rem",
          paddingBottom: "7rem",
        }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #c7c5fb 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.35,
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium mb-8"
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 2px 12px rgba(91,88,246,0.08)",
              color: "#475569",
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: "#5B58F6" }} />
            AI-Powered Product Launch Distribution
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#020617",
              marginBottom: "1.5rem",
            }}
          >
            Launch your product to the{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              right places
            </span>
          </h1>

          {/* Sub-heading */}
          <p
            style={{
              fontSize: "1.2rem",
              color: "#64748b",
              maxWidth: "640px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            Stop guessing where to submit your product. Our AI analyzes your
            product and generates a curated list of the best directories, blogs,
            and press sites — tailored to your niche.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full font-semibold text-white text-base"
              style={{
                background: "#5B58F6",
                padding: "14px 36px",
                boxShadow: "0 0 24px rgba(91,88,246,0.45), 0 4px 12px rgba(91,88,246,0.3)",
                transition: "all 0.2s",
                textDecoration: "none",
              }}
            >
              Get Your Free Curation →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full font-medium text-base"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid #e2e8f0",
                padding: "14px 36px",
                color: "#475569",
                backdropFilter: "blur(8px)",
                transition: "all 0.2s",
                textDecoration: "none",
              }}
            >
              View Pricing
            </Link>
          </div>

          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginTop: "1rem", fontWeight: 300 }}>
            Free plan available — no credit card required
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {trustBadges.map((b, i) => (
              <div key={i} className="flex items-center gap-2" style={{ color: "#64748b", fontSize: "0.875rem" }}>
                <span style={{ color: "#5B58F6", fontWeight: 600 }}>✓</span>
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════ */}
      <section style={{ background: "#ffffff", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "3rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <p style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700, color: "#5B58F6", lineHeight: 1.1 }}>
                  {s.value}
                </p>
                <p style={{ color: "#64748b", fontSize: "0.9rem", fontWeight: 300, marginTop: "0.25rem" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section style={{ background: "#FAFAFA", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ color: "#5B58F6", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Features
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, color: "#020617", letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              Everything you need to get distribution
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.1rem", fontWeight: 300, maxWidth: "540px", margin: "0 auto" }}>
              Built for indie hackers, SaaS founders, and product teams who want real traction fast.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  borderRadius: "1.5rem",
                  padding: "1.75rem",
                  border: "1px solid rgba(226,232,240,0.9)",
                  boxShadow: "0 2px 16px rgba(91,88,246,0.05)",
                  transition: "all 0.25s",
                }}
              >
                <div
                  style={{
                    width: "3rem",
                    height: "3rem",
                    borderRadius: "0.875rem",
                    background: "rgba(91,88,246,0.09)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 600, color: "#020617", marginBottom: "0.5rem" }}>
                  {f.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", fontWeight: 300, lineHeight: 1.65 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section style={{ background: "#ffffff", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ color: "#5B58F6", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              How it works
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, color: "#020617", letterSpacing: "-0.02em" }}>
              Three steps to your distribution plan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "4rem",
                    height: "4rem",
                    borderRadius: "1.25rem",
                    background: "linear-gradient(135deg, rgba(91,88,246,0.14), rgba(124,58,237,0.09))",
                    border: "1px solid rgba(91,88,246,0.22)",
                    boxShadow: "0 0 0 8px rgba(91,88,246,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <span style={{ color: "#5B58F6", fontWeight: 700, fontSize: "1.25rem" }}>{i + 1}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 600, color: "#020617", marginBottom: "0.75rem" }}>
                  {step.title}
                </h3>
                <p style={{ color: "#64748b", fontWeight: 300, lineHeight: 1.7 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          WHAT'S IN YOUR CURATION
      ══════════════════════════════════════ */}
      <section style={{ background: "#FAFAFA", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ color: "#5B58F6", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              What you receive
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, color: "#020617", letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              What&apos;s in your curation
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.05rem", fontWeight: 300, maxWidth: "520px", margin: "0 auto" }}>
              Every curation is organized into three sections to maximize your reach.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {curationSections.map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  borderRadius: "2rem",
                  padding: "2rem",
                  border: "1px solid rgba(226,232,240,0.9)",
                  boxShadow: "0 4px 24px rgba(91,88,246,0.06)",
                  transition: "all 0.25s",
                }}
              >
                <div
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "1rem",
                    background: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.6rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {s.icon}
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 600, color: "#020617", marginBottom: "0.75rem" }}>
                  {s.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", fontWeight: 300, lineHeight: 1.65, marginBottom: "1rem" }}>{s.description}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {s.bullets.map((b, j) => (
                    <li key={j} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.8rem", fontWeight: 300 }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5B58F6", flexShrink: 0 }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PRICING PREVIEW
      ══════════════════════════════════════ */}
      <section style={{ background: "#ffffff", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ color: "#5B58F6", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Pricing
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, color: "#020617", letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.05rem", fontWeight: 300, maxWidth: "500px", margin: "0 auto" }}>
              Start free. No credit card required. Upgrade when you need more.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ maxWidth: "1100px", margin: "0 auto" }}>
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  borderRadius: "2rem",
                  padding: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  ...(plan.popular
                    ? { background: "#020617", boxShadow: "0 12px 48px rgba(91,88,246,0.3)" }
                    : { background: "#ffffff", border: "1px solid rgba(226,232,240,0.9)", boxShadow: "0 4px 20px rgba(91,88,246,0.06)" }),
                }}
              >
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
                    <span style={{ fontSize: "0.875rem", color: plan.popular ? "#94a3b8" : "#94a3b8", fontWeight: 300 }}>
                      {plan.period}
                    </span>
                  )}
                </div>

                {/* Billing note */}
                <p style={{ fontSize: "0.75rem", color: plan.popular ? "#64748b" : "#94a3b8", fontWeight: 300, marginBottom: "0.75rem" }}>
                  {plan.billingNote}
                </p>

                {/* Credits pill */}
                <div
                  style={{
                    background: plan.popular ? "rgba(91,88,246,0.25)" : "rgba(91,88,246,0.08)",
                    borderRadius: "0.75rem",
                    padding: "6px 12px",
                    marginBottom: "1.25rem",
                    display: "inline-block",
                  }}
                >
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

                {/* CTA button */}
                <Link
                  href={plan.slug === "free" ? "/signup" : `/signup?plan=${plan.slug}`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    borderRadius: "999px",
                    padding: "11px 20px",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    ...(plan.popular
                      ? { background: "#5B58F6", color: "#ffffff", boxShadow: "0 0 20px rgba(91,88,246,0.5)" }
                      : plan.slug === "lifetime"
                      ? { background: "#7c3aed", color: "#ffffff" }
                      : { background: "#020617", color: "#ffffff" }),
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* See full pricing link */}
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link
              href="/pricing"
              style={{
                color: "#5B58F6",
                fontWeight: 500,
                fontSize: "0.9rem",
                textDecoration: "none",
                borderBottom: "1px solid rgba(91,88,246,0.3)",
                paddingBottom: "2px",
              }}
            >
              See full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════ */}
      <section style={{ background: "#FAFAFA", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ color: "#5B58F6", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Testimonials
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, color: "#020617", letterSpacing: "-0.02em" }}>
              Founders love PublishRoad
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  borderRadius: "2rem",
                  padding: "2rem",
                  border: "1px solid rgba(226,232,240,0.9)",
                  boxShadow: "0 4px 24px rgba(91,88,246,0.06)",
                }}
              >
                {/* Stars */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "1rem" }}>
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="16" height="16" fill="#f59e0b" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p style={{ color: "#475569", fontSize: "0.9rem", fontWeight: 300, lineHeight: 1.7, fontStyle: "italic", marginBottom: "1.5rem" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "50%",
                      background: t.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p style={{ color: "#020617", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>{t.name}</p>
                    <p style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 300, margin: 0 }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════ */}
      <section
        style={{
          background: "#020617",
          padding: "7rem 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow orbs */}
        <div style={{ position: "absolute", top: "-8rem", left: "20%", width: "24rem", height: "24rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(91,88,246,0.28) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-6rem", right: "20%", width: "18rem", height: "18rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              marginBottom: "1.25rem",
            }}
          >
            Ready to launch smarter?
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.1rem", fontWeight: 300, maxWidth: "520px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
            Join hundreds of founders who used PublishRoad to get their products
            in front of the right audiences on day one.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                background: "#5B58F6",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "1rem",
                padding: "14px 36px",
                textDecoration: "none",
                boxShadow: "0 0 28px rgba(91,88,246,0.5)",
                transition: "all 0.2s",
              }}
            >
              Start Free — No Card Needed
            </Link>
            <Link
              href="/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ffffff",
                fontWeight: 500,
                fontSize: "1rem",
                padding: "14px 36px",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              See All Plans
            </Link>
          </div>

          <p style={{ color: "#475569", fontSize: "0.875rem", marginTop: "1.5rem", fontWeight: 300 }}>
            1 free curation included &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════
   DATA
══════════════════════════════════════ */

const trustBadges = [
  "No credit card required",
  "1 free curation on signup",
  "Results in under 2 minutes",
  "10,000+ curated sites",
];

const stats = [
  { value: "10K+", label: "Sites in our database" },
  { value: "500+", label: "Products launched" },
  { value: "3", label: "Result categories" },
  { value: "< 2min", label: "Average curation time" },
];

const features = [
  {
    icon: "🤖",
    title: "AI-Powered Matching",
    description: "Our AI analyzes your product URL, keywords, and description to find the most relevant distribution channels for your niche.",
  },
  {
    icon: "🎯",
    title: "Country-Specific Results",
    description: "Target specific countries or get global coverage. Each curation filters sites by your target audience's geography.",
  },
  {
    icon: "📊",
    title: "Domain Authority Scores",
    description: "Every site comes with its Domain Authority score so you know exactly how valuable each backlink opportunity is.",
  },
  {
    icon: "⚡",
    title: "Results in Under 2 Minutes",
    description: "No waiting days for manual research. Get a full distribution plan ready to execute the moment you submit.",
  },
  {
    icon: "🗂️",
    title: "Three Organized Sections",
    description: "Results are split into product directories, guest post opportunities, and press release sites for easy action.",
  },
  {
    icon: "🔒",
    title: "Secure & Private",
    description: "Your product details and curations are private. We never share your data or use it to train our models.",
  },
];

const steps = [
  {
    title: "Enter your product details",
    description: "Add your product URL, target country, keywords, and a brief description of what your product does.",
  },
  {
    title: "AI matches your product",
    description: "Our AI analyzes your product and matches it against our curated database of sites, blogs, and directories.",
  },
  {
    title: "Get your distribution plan",
    description: "Receive a categorized list of the best places to submit, get backlinks, and get press coverage.",
  },
];

const curationSections = [
  {
    icon: "🚀",
    title: "Product Distribution Sites",
    bg: "rgba(91, 88, 246, 0.1)",
    description: "Curated directories, product hunt alternatives, and listing sites where your product can get traction.",
    bullets: ["Product Hunt alternatives", "SaaS directories", "App marketplaces", "Startup listing sites"],
  },
  {
    icon: "🔗",
    title: "Guest Post & Backlink Sites",
    bg: "rgba(124, 58, 237, 0.08)",
    description: "Blogs and publications in your niche that accept guest posts, giving you SEO-boosting backlinks.",
    bullets: ["Niche-specific blogs", "Write-for-us opportunities", "High DA publications", "Industry media"],
  },
  {
    icon: "📰",
    title: "Press Release Sites",
    bg: "rgba(91, 88, 246, 0.06)",
    description: "PR distribution platforms and news sites where your product announcement can reach journalists.",
    bullets: ["PR wire services", "Tech news outlets", "Startup media", "Industry newsletters"],
  },
];

const pricingPlans = [
  {
    name: "Free",
    slug: "free",
    price: "$0",
    period: "",
    billingNote: "Forever free",
    credits: "1 curation included",
    popular: false,
    badge: null,
    cta: "Get Started Free",
    features: ["1 curation", "5 results shown", "All 3 sections", "Basic filtering"],
  },
  {
    name: "Starter",
    slug: "starter",
    price: "$9",
    period: "",
    billingNote: "One-time payment",
    credits: "1 full curation",
    popular: false,
    badge: null,
    cta: "Get Starter",
    features: ["1 full curation", "50+ results", "All 3 sections", "Export results"],
  },
  {
    name: "Pro",
    slug: "pro",
    price: "$39",
    period: "/mo",
    billingNote: "Billed monthly",
    credits: "10 curations/month",
    popular: true,
    badge: null,
    cta: "Get Pro",
    features: ["10 curations/month", "50+ results each", "Priority matching", "Export results", "Email notifications"],
  },
  {
    name: "Lifetime",
    slug: "lifetime",
    price: "$599",
    period: "",
    billingNote: "One-time, forever",
    credits: "Unlimited curations",
    popular: false,
    badge: "Best Value",
    cta: "Get Lifetime",
    features: ["Unlimited curations", "50+ results each", "Priority matching", "All future features", "Priority support"],
  },
];

const testimonials = [
  {
    quote: "I launched my SaaS and submitted it to 30+ sites in a single afternoon thanks to PublishRoad. Got my first 200 users from those listings.",
    name: "Alex M.",
    role: "Founder, SaaS Tool",
    color: "#5B58F6",
  },
  {
    quote: "The guest post list alone was worth the Pro subscription. Found 8 blogs in my niche that accepted pitches — 3 said yes.",
    name: "Sarah K.",
    role: "Content Marketer",
    color: "#7C3AED",
  },
  {
    quote: "Saves me hours of manual research every time I launch a new product. The AI matching is surprisingly accurate for my B2B niche.",
    name: "James L.",
    role: "Product Manager",
    color: "#0ea5e9",
  },
];
