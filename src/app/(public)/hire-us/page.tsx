import Link from "next/link";
import type { Metadata } from "next";
import { buildTwitterMetadata, getSiteUrl, getSocialImages } from "@/lib/seo";

const APP_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Hire Us — Done-For-You Product Launch Distribution",
  description:
    "Let our team handle your product distribution. Two packages: $399 for full directory submissions, or $999 for directory submissions + guest posts + press release connections. Done for you in 25 days.",
  alternates: { canonical: `${APP_URL}/hire-us` },
  openGraph: {
    title: "Hire Us — Done-For-You Product Launch Distribution",
    description:
      "Skip the DIY grind. Choose from two packages: $399 for directory submissions, or $999 for the full service including guest posts and press release connections. 25-day delivery.",
    url: `${APP_URL}/hire-us`,
    type: "website",
    siteName: "PublishRoad",
    images: getSocialImages("Hire PublishRoad"),
  },
  twitter: buildTwitterMetadata({
    title: "Hire Us — Done-For-You Product Launch Distribution",
    description:
      "Skip the DIY grind. Choose from two packages: $399 for directory submissions, or $999 for the full service including guest posts and press release connections. 25-day delivery.",
  }),
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Done-For-You Product Launch Distribution",
  provider: {
    "@type": "Organization",
    name: "PublishRoad",
    url: APP_URL,
  },
  description:
    "Done-for-you product distribution in two packages. Starter ($399): full directory submissions. Complete ($999): directory submissions + guest posts on up to 20 sites + press release team connection. All completed within 25 days.",
  offers: [
    {
      "@type": "Offer",
      price: "399",
      priceCurrency: "USD",
      name: "Starter",
      description: "Directory submissions to your full curated list. 25-day delivery.",
    },
    {
      "@type": "Offer",
      price: "999",
      priceCurrency: "USD",
      name: "Complete",
      description: "Directory submissions + guest posts on up to 20 sites + press release team connection. 25-day delivery.",
    },
  ],
};

export default function HireUsPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(91,88,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(124,58,237,0.08) 0%, transparent 60%), #FAFAFA",
          paddingTop: "7rem",
          paddingBottom: "7rem",
        }}
      >
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
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#5B58F6" }} />
            Done-For-You Launch Service
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
              maxWidth: "860px",
              margin: "0 auto 1.5rem",
            }}
          >
            We handle your entire launch.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              You just ship.
            </span>
          </h1>

          {/* Sub-heading */}
          <p
            style={{
              fontSize: "1.2rem",
              color: "#64748b",
              maxWidth: "620px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            Stop spending weeks manually submitting to directories and chasing guest posts. Our team takes your
            PublishRoad curation list and executes everything — submissions, guest posts, and press release
            connections — so you can stay focused on building.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center rounded-full font-semibold text-white text-base"
              style={{
                background: "#5B58F6",
                padding: "14px 40px",
                boxShadow: "0 0 28px rgba(91,88,246,0.45), 0 4px 12px rgba(91,88,246,0.3)",
                transition: "all 0.2s",
                textDecoration: "none",
              }}
            >
              View Packages — from $399 →
            </Link>
            <a
              href="#pricing"
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
              See What&apos;s Included
            </a>
          </div>

          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginTop: "1rem", fontWeight: 300 }}>
            No hidden costs · Starter in 15 days · Complete in 25 days
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {heroBadges.map((b, i) => (
              <div key={i} className="flex items-center gap-2" style={{ color: "#64748b", fontSize: "0.875rem" }}>
                <span style={{ color: "#5B58F6", fontWeight: 600 }}>✓</span>
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SOCIAL PROOF BAR
      ══════════════════════════════════════ */}
      <section
        style={{
          background: "#ffffff",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
          padding: "3rem 0",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {proofStats.map((s, i) => (
              <div key={i}>
                <p
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "#5B58F6",
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </p>
                <p style={{ color: "#64748b", fontSize: "0.9rem", fontWeight: 300, marginTop: "0.25rem" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          WHAT WE DO
      ══════════════════════════════════════ */}
      <section id="what-we-do" style={{ background: "#FAFAFA", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p
              style={{
                color: "#5B58F6",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              What&apos;s included
            </p>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 700,
                color: "#020617",
                letterSpacing: "-0.02em",
                marginBottom: "1rem",
              }}
            >
              Full-spectrum launch distribution
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "1.1rem",
                fontWeight: 300,
                maxWidth: "540px",
                margin: "0 auto",
              }}
            >
              Three focused services. All executed by our team. All based on your curated list.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  borderRadius: "1.5rem",
                  padding: "1.75rem",
                  border: "1px solid rgba(226,232,240,0.9)",
                  boxShadow: "0 2px 16px rgba(91,88,246,0.05)",
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
                  {s.icon}
                </div>
                <div
                  className="inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-3"
                  style={{ background: "rgba(91,88,246,0.08)", color: "#5B58F6" }}
                >
                  Step {i + 1}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#020617",
                    marginBottom: "0.5rem",
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", fontWeight: 300, lineHeight: 1.65 }}>
                  {s.description}
                </p>
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
            <p
              style={{
                color: "#5B58F6",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              The process
            </p>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 700,
                color: "#020617",
                letterSpacing: "-0.02em",
              }}
            >
              From brief to traction in 25 days
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* connector line on desktop */}
            <div
              className="hidden md:block absolute top-10 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(91,88,246,0.2), transparent)", margin: "0 12.5%" }}
            />
            {processSteps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center relative">
                <div
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #5B58F6, #7C3AED)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    marginBottom: "1.25rem",
                    boxShadow: "0 0 20px rgba(91,88,246,0.3)",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>{i + 1}</span>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#020617",
                    marginBottom: "0.5rem",
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 300, lineHeight: 1.6 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          WHO IT'S FOR
      ══════════════════════════════════════ */}
      <section style={{ background: "#FAFAFA", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p
                style={{
                  color: "#5B58F6",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "0.75rem",
                }}
              >
                Who it&apos;s for
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.8rem, 4vw, 2.25rem)",
                  fontWeight: 700,
                  color: "#020617",
                  letterSpacing: "-0.02em",
                  marginBottom: "1.25rem",
                }}
              >
                Built for founders who value their time
              </h2>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "1.05rem",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  marginBottom: "2rem",
                }}
              >
                You&apos;ve already built the product. Now you need eyes on it — fast. Our service is for
                builders who know that distribution is the bottleneck, and don&apos;t have 40 hours to
                manually submit to every site on their list and chase guest post placements.
              </p>
              <div className="space-y-3">
                {idealFor.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        borderRadius: "50%",
                        background: "rgba(91,88,246,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <svg className="w-3 h-3" style={{ color: "#5B58F6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p style={{ color: "#374151", fontSize: "0.95rem", lineHeight: 1.5 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: not-for list */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "1.75rem",
                padding: "2rem",
                border: "1px solid rgba(226,232,240,0.9)",
                boxShadow: "0 4px 32px rgba(91,88,246,0.07)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#020617",
                  marginBottom: "1.25rem",
                }}
              >
                This service is a great fit if you&apos;re...
              </p>
              <div className="space-y-4">
                {fitChecks.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 pb-4"
                    style={{ borderBottom: i < fitChecks.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  >
                    <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{c.icon}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#020617", marginBottom: "0.25rem" }}>
                        {c.title}
                      </p>
                      <p style={{ fontSize: "0.825rem", color: "#64748b", fontWeight: 300, lineHeight: 1.5 }}>
                        {c.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PRICING BLOCK
      ══════════════════════════════════════ */}
      <section id="pricing" style={{ background: "#ffffff", padding: "6rem 0" }}>
        <div className="max-w-[960px] mx-auto px-6 lg:px-8 text-center">
          <p
            style={{
              color: "#5B58F6",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            Pricing
          </p>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              fontWeight: 700,
              color: "#020617",
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            Two packages. Pick what you need.
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.05rem", fontWeight: 300, marginBottom: "3rem" }}>
            No retainer. No monthly subscription. No upsells after you pay.
          </p>

          {/* Two price cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

            {/* Starter — $399 */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "2rem",
                padding: "2.5rem",
                border: "1px solid rgba(91,88,246,0.2)",
                boxShadow: "0 4px 32px rgba(91,88,246,0.07)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="inline-block self-start rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{ background: "rgba(91,88,246,0.08)", color: "#5B58F6" }}
              >
                Starter
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "4rem", fontWeight: 800, color: "#020617", lineHeight: 1 }}>
                $399
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.5rem", marginBottom: "2rem" }}>
                One-time · No recurring fees
              </p>
              <div className="space-y-3 mb-8 text-left flex-1">
                {starterIncludes.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#5B58F6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ color: "#374151", fontSize: "0.9rem" }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/hire-us/start?package=starter"
                className="block w-full text-center rounded-full font-semibold"
                style={{
                  background: "#5B58F6",
                  color: "white",
                  padding: "14px 0",
                  textDecoration: "none",
                  fontSize: "1rem",
                  marginTop: "auto",
                }}
              >
                Get Started — $399 →
              </Link>
            </div>

            {/* Complete — $999 */}
            <div
              className="relative"
              style={{
                background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
                borderRadius: "2rem",
                padding: "2.5rem",
                boxShadow: "0 0 60px rgba(91,88,246,0.35), 0 20px 60px rgba(91,88,246,0.2)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="inline-block self-start rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
              >
                Complete ✦ Most Popular
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "4rem", fontWeight: 800, color: "white", lineHeight: 1 }}>
                $999
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", marginTop: "0.5rem", marginBottom: "2rem" }}>
                One-time · No recurring fees
              </p>
              <div className="space-y-3 mb-8 text-left flex-1">
                {completeIncludes.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.9)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/hire-us/start?package=complete"
                className="block w-full text-center rounded-full font-semibold"
                style={{
                  background: "white",
                  color: "#5B58F6",
                  padding: "14px 0",
                  textDecoration: "none",
                  fontSize: "1rem",
                  marginTop: "auto",
                }}
              >
                Get Started — $999 →
              </Link>
            </div>

          </div>

          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginTop: "1.5rem", fontWeight: 300 }}>
            Contact us first — we&apos;ll confirm your product is a good fit before you pay.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TESTIMONIALS / TRUST
      ══════════════════════════════════════ */}
      <section style={{ background: "#FAFAFA", padding: "6rem 0" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p
              style={{
                color: "#5B58F6",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              Why choose us
            </p>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 700,
                color: "#020617",
                letterSpacing: "-0.02em",
              }}
            >
              The PublishRoad advantage
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {advantages.map((a, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  borderRadius: "1.5rem",
                  padding: "2rem",
                  border: "1px solid rgba(226,232,240,0.9)",
                  boxShadow: "0 2px 16px rgba(91,88,246,0.05)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "50%",
                    background: "rgba(91,88,246,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    margin: "0 auto 1.25rem",
                  }}
                >
                  {a.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#020617",
                    marginBottom: "0.75rem",
                  }}
                >
                  {a.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 300, lineHeight: 1.65 }}>
                  {a.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FAQ
      ══════════════════════════════════════ */}
      <section style={{ background: "#ffffff", padding: "6rem 0" }}>
        <div className="max-w-[760px] mx-auto px-6 lg:px-8">
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p
              style={{
                color: "#5B58F6",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              FAQ
            </p>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.8rem, 4vw, 2.25rem)",
                fontWeight: 700,
                color: "#020617",
                letterSpacing: "-0.02em",
              }}
            >
              Common questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#FAFAFA",
                  borderRadius: "1.25rem",
                  padding: "1.5rem",
                  border: "1px solid rgba(226,232,240,0.8)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: "#020617",
                    marginBottom: "0.5rem",
                  }}
                >
                  {item.q}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 300, lineHeight: 1.65 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════ */}
      <section style={{ background: "#FAFAFA", padding: "6rem 0" }}>
        <div
          className="max-w-[860px] mx-auto rounded-[2rem] p-14 text-center relative overflow-hidden"
          style={{ backgroundColor: "var(--dark)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(91,88,246,0.28) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <p
              style={{
                color: "rgba(91,88,246,0.9)",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Ready to launch?
            </p>
            <h2
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
            >
              Stop leaving growth on the table.
            </h2>
            <p className="text-slate-400 font-light mb-10 text-lg" style={{ maxWidth: "560px", margin: "0 auto 2.5rem" }}>
              Every day you don&apos;t distribute is a day your competitors get the placements you should have.
              Starting at $399 for full directory submissions, or $999 for the complete package with guest posts and press release connections — all done for you in 25 days.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/hire-us/start?package=starter">
                <button
                  className="rounded-full px-10 h-14 text-base font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
                    boxShadow: "0 0 30px rgba(91,88,246,0.5), 0 8px 20px rgba(91,88,246,0.3)",
                  }}
                >
                  View Packages — from $399 →
                </button>
              </Link>
              <Link href="/pricing">
                <button className="rounded-full px-10 h-14 text-base font-medium text-white border border-white/20 hover:bg-white/10 transition-all">
                  Or explore DIY plans
                </button>
              </Link>
            </div>
            <p style={{ color: "#475569", fontSize: "0.8rem", marginTop: "1.5rem" }}>
              We review every request — contact us and we&apos;ll reply within 24 hours.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Data ─── */

const heroBadges = [
  "Fully managed execution",
  "2 packages from $399",
  "Results in 25 days",
  "No recurring fees",
];

const proofStats = [
  { value: "2", label: "Packages to choose from" },
  { value: "20+", label: "Guest post sites (Complete)" },
  { value: "25", label: "Days to full execution" },
  { value: "$399", label: "Starting price" },
];

const services = [
  {
    icon: "🌐",
    title: "Full Directory Submissions",
    description:
      "We submit your app to every distribution site on your curated PublishRoad list — all handled by our team so you don't lift a finger. Every relevant directory, startup listing, and app catalogue gets your product.",
  },
  {
    icon: "✍️",
    title: "Guest Posting (Up to 20 Sites)",
    description:
      "We secure and publish guest posts on up to 20 sites from your curated list. Each post is tailored to the site's audience and includes a contextual link back to your product.",
  },
  {
    icon: "📰",
    title: "Press Release Connection",
    description:
      "We connect you directly with our press release team. Depending on the press release type and distribution tier you choose, it may be included at no extra charge or require a separate fee — we'll walk you through the options.",
  },
];

const processSteps = [
  {
    title: "Submit Your Brief",
    description: "Share your product URL, keywords, target country, and a short description. Takes 5 minutes.",
  },
  {
    title: "We Review Your List",
    description: "Our team goes through your curated PublishRoad list and maps out every directory and guest post target.",
  },
  {
    title: "We Execute Everything",
    description: "We submit to all directories, publish up to 20 guest posts, and connect you with our press release team — all within 25 days.",
  },
  {
    title: "You Get a Full Report",
    description: "Receive a detailed breakdown of every submission made, every guest post published, and your press release options.",
  },
];

const idealFor = [
  "Indie hackers launching a new SaaS, app, or digital product",
  "Startup founders preparing for a ProductHunt launch",
  "Small teams with no dedicated marketing resource",
  "Entrepreneurs who want traction but not the grind",
  "Bootstrappers who know distribution beats product in year one",
];

const fitChecks = [
  {
    icon: "🚀",
    title: "Launching or re-launching a product",
    description: "Ideal for any product that needs visibility — whether it's brand new or rebranding.",
  },
  {
    icon: "⏱️",
    title: "Short on time",
    description: "If you'd rather build features than manually submit to every site on your curation list, this is for you.",
  },
  {
    icon: "🎯",
    title: "Clear target audience",
    description: "You know who your users are. We'll find the exact places they hang out online.",
  },
  {
    icon: "📈",
    title: "Serious about growth",
    description: "You're investing in real distribution — not just hoping ProductHunt works out.",
  },
];

const starterIncludes = [
  "Submissions to all sites on your curated distribution list",
  "Full execution report with all submission links",
  "15-day delivery guarantee",
];

const completeIncludes = [
  "Everything in the Starter package",
  "Guest posts on up to 20 sites from your curation list",
  "Direct introduction to our press release team",
  "Press release may be included free or charged separately by tier",
  "Full execution report with all submissions & published links",
  "25-day delivery guarantee",
];

const advantages = [
  {
    icon: "🗄️",
    title: "Your Curated List, Fully Executed",
    description:
      "We work directly from your PublishRoad curation list — no guessing, no generic databases. Every submission and guest post targets the exact sites curated for your product.",
  },
  {
    icon: "✍️",
    title: "Real Guest Posts, Not Spam",
    description:
      "Each guest post is written and placed by our team on real sites from your list — up to 20 placements, each with a contextual backlink to your product.",
  },
  {
    icon: "📰",
    title: "Press Release Flexibility",
    description:
      "We connect you with our press release team and explain all available tiers. Some options are included in your fee; others can be added based on your budget and goals.",
  },
  {
    icon: "📋",
    title: "Full Transparency",
    description:
      "You receive a detailed report of every directory submitted and every guest post published — with live links and timestamps.",
  },
  {
    icon: "⚡",
    title: "25-Day Turnaround",
    description:
      "We commit to completing everything within 25 days of receiving your brief and payment.",
  },
  {
    icon: "💼",
    title: "Two Packages, No Surprises",
    description:
      "$399 for directory submissions. $999 for the full package including guest posts and press release connections. Press release costs (if any) are clarified upfront before you commit.",
  },
];

const faqItems = [
  {
    q: "What's the difference between the two packages?",
    a: "The Starter ($399) covers directory submissions only — we submit your app to every site on your PublishRoad curation list and send you a full report. The Complete ($999) includes everything in Starter plus guest posts on up to 20 sites from your list, and a direct introduction to our press release team.",
  },
  {
    q: "Which package should I choose?",
    a: "If you mainly need visibility through directory listings, Starter at $399 is the right pick. If you also want SEO-boosting guest posts and press coverage, the Complete package at $999 gives you all three services.",
  },
  {
    q: "How do I get started?",
    a: "Click 'Get Started' on the package you want and reach out via the contact page with your product URL and PublishRoad curation list. We review every request and reply within 24 hours to confirm it's a good fit before you pay.",
  },
  {
    q: "How long does it take?",
    a: "Starter is delivered within 15 days. Complete is delivered within 25 days. Both timelines begin from when we receive your brief and payment.",
  },
  {
    q: "How does the press release work? (Complete only)",
    a: "We introduce you to our press release partners and walk you through all available tiers. Depending on the distribution scope you choose, the press release may be included at no extra charge or require a separate fee. We'll give you a clear breakdown before you commit to anything.",
  },
  {
    q: "Do you guarantee results?",
    a: "We guarantee execution — every directory on your list will be submitted to, up to 20 guest posts will be published (Complete), and you'll be connected with the press release team. We do not guarantee acceptance by third-party sites, but every action is properly completed and documented.",
  },
  {
    q: "What do I receive at the end?",
    a: "A detailed report with every directory submitted (Starter & Complete) and every guest post published with live links (Complete), plus a summary of press release options and next steps.",
  },
  {
    q: "Is this different from using the PublishRoad app myself?",
    a: "Yes. The app gives you the curated list — you do the work yourself. The Hire Us service means our team handles all the submissions and guest posts for you. Think of it as the difference between a map and a guided tour.",
  },
  {
    q: "Do you offer refunds?",
    a: "Due to the manual nature of the work, we do not offer refunds once execution has begun. We always confirm your product is a good fit and clarify any press release costs before taking payment.",
  },
];
