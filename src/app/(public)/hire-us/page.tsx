import Link from "next/link";
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://publishroad.com";

export const metadata: Metadata = {
  title: "Hire Us — Done-For-You Product Launch Distribution | PublishRoad",
  description:
    "Let our team handle your entire product launch distribution. We submit to directories, secure guest posts, distribute press releases, reach influencers, Reddit communities, and investors — all done for you. One flat fee: $999.",
  alternates: { canonical: `${APP_URL}/hire-us` },
  openGraph: {
    title: "Hire Us — Done-For-You Product Launch Distribution | PublishRoad",
    description:
      "Skip the DIY grind. We handle your full product launch distribution — directories, guest posts, press releases, influencers, Reddit & investors. One flat $999 fee.",
    url: `${APP_URL}/hire-us`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Hire PublishRoad" }],
  },
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
    "Full-service product launch distribution. We handle directory submissions, guest post outreach, press release distribution, social influencer outreach, Reddit community seeding, and investor introductions.",
  offers: {
    "@type": "Offer",
    price: "999",
    priceCurrency: "USD",
    description: "One-time flat fee for full done-for-you launch distribution.",
  },
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
            Stop spending weeks submitting to directories and chasing influencers. Our team executes your
            full distribution strategy — from day one to first traction — so you can stay focused on building.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full font-semibold text-white text-base"
              style={{
                background: "#5B58F6",
                padding: "14px 40px",
                boxShadow: "0 0 28px rgba(91,88,246,0.45), 0 4px 12px rgba(91,88,246,0.3)",
                transition: "all 0.2s",
                textDecoration: "none",
              }}
            >
              Hire Us — $999 →
            </Link>
            <a
              href="#what-we-do"
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
            One flat fee · No hidden costs · Results in 14 days
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
              Six distribution channels. All executed by our team. All tailored to your product.
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
              From brief to traction in 14 days
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
                manually submit to 200+ directories.
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
      <section style={{ background: "#ffffff", padding: "6rem 0" }}>
        <div className="max-w-[800px] mx-auto px-6 lg:px-8 text-center">
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
            One flat fee. Everything included.
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.05rem", fontWeight: 300, marginBottom: "3rem" }}>
            No retainer. No monthly subscription. No upsells after you pay.
          </p>

          {/* Price card */}
          <div
            className="relative mx-auto max-w-[480px]"
            style={{
              background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
              borderRadius: "2rem",
              padding: "2.5rem",
              boxShadow: "0 0 60px rgba(91,88,246,0.35), 0 20px 60px rgba(91,88,246,0.2)",
            }}
          >
            <div
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold mb-4"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            >
              Done-For-You Service
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "5rem", fontWeight: 800, color: "white", lineHeight: 1 }}>
              $999
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", marginTop: "0.5rem", marginBottom: "2rem" }}>
              One-time · No recurring fees
            </p>

            <div className="space-y-3 mb-8 text-left">
              {pricingIncludes.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.9)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" }}>{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/contact"
              className="block w-full text-center rounded-full font-semibold"
              style={{
                background: "white",
                color: "#5B58F6",
                padding: "14px 0",
                textDecoration: "none",
                fontSize: "1rem",
              }}
            >
              Get Started — $999 →
            </Link>
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
              Every day you don&apos;t distribute is a day your competitors get the placement you should have.
              For $999, we fix that — completely done for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <button
                  className="rounded-full px-10 h-14 text-base font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
                    boxShadow: "0 0 30px rgba(91,88,246,0.5), 0 8px 20px rgba(91,88,246,0.3)",
                  }}
                >
                  Hire Us — $999 →
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
  "6 distribution channels",
  "Results in 14 days",
  "One flat $999 fee",
];

const proofStats = [
  { value: "6", label: "Distribution channels covered" },
  { value: "200+", label: "Sites & platforms in our database" },
  { value: "14", label: "Days to full execution" },
  { value: "$999", label: "One-time flat fee" },
];

const services = [
  {
    icon: "🌐",
    title: "Product Directory Submissions",
    description:
      "We identify and submit your product to the most relevant product directories, startup listings, and app catalogues — targeting sites with real traffic and high domain authority.",
  },
  {
    icon: "✍️",
    title: "Guest Post & Backlink Outreach",
    description:
      "We find authoritative blogs in your niche and reach out for guest post placements and contextual backlinks that drive both SEO value and referral traffic.",
  },
  {
    icon: "📰",
    title: "Press Release Distribution",
    description:
      "We write and distribute a professional press release across the top PR platforms, increasing your chances of editorial pickup and news coverage.",
  },
  {
    icon: "🤳",
    title: "Social Influencer Outreach",
    description:
      "We identify micro and mid-tier influencers whose audience aligns with your product and initiate genuine outreach campaigns on your behalf.",
  },
  {
    icon: "💬",
    title: "Reddit Community Seeding",
    description:
      "We find the exact subreddits where your target users hang out and craft authentic posts that generate discussion, upvotes, and real user interest.",
  },
  {
    icon: "💰",
    title: "Investor & Fund Introductions",
    description:
      "We match your product to relevant early-stage investors and funds based on sector, stage, and ticket size — and submit a tailored pitch on your behalf.",
  },
];

const processSteps = [
  {
    title: "Submit Your Brief",
    description: "Fill in your product URL, keywords, target country, and a short description. Takes 5 minutes.",
  },
  {
    title: "We Build Your Strategy",
    description: "Our team runs your product through our AI matching engine and hand-curates the best opportunities.",
  },
  {
    title: "We Execute Everything",
    description: "Submissions, outreach, press releases, and community posts are all handled by our team.",
  },
  {
    title: "You Get a Full Report",
    description: "Receive a detailed breakdown of every action taken, every site submitted, and every outreach sent.",
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
    description: "If you'd rather build features than manually submit to 200 directories, this is for you.",
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

const pricingIncludes = [
  "Product directory submissions (up to 40 sites)",
  "Guest post & backlink outreach (up to 15 targets)",
  "Press release written + distributed",
  "Social influencer outreach (up to 10 profiles)",
  "Reddit community seeding (up to 8 subreddits)",
  "Investor & fund introductions (up to 10 leads)",
  "Full execution report with all links",
  "14-day delivery guarantee",
];

const advantages = [
  {
    icon: "🤖",
    title: "AI-Matched, Human-Executed",
    description:
      "Our AI finds the best distribution opportunities for your exact product. Our team then personally executes every action — no automation spam, no shortcuts.",
  },
  {
    icon: "🗄️",
    title: "Curated Database of 200+ Platforms",
    description:
      "We don't use generic site lists. Every directory, blog, subreddit, and fund in our database is manually reviewed for quality, traffic, and relevance.",
  },
  {
    icon: "📋",
    title: "Full Transparency",
    description:
      "You receive a detailed report of every submission made, every outreach sent, and every post published — with links and timestamps.",
  },
  {
    icon: "⚡",
    title: "14-Day Turnaround",
    description:
      "We commit to completing your full distribution within 14 days of receiving your brief. Fast enough to support a live launch.",
  },
  {
    icon: "💼",
    title: "Flat Fee, No Surprises",
    description:
      "$999 covers everything. No upsells, no add-ons, no monthly retainer. One payment for one complete launch.",
  },
  {
    icon: "🎯",
    title: "Country & Niche Targeted",
    description:
      "Your distribution is filtered by target country and product category — so every placement reaches the audience that actually matters to you.",
  },
];

const faqItems = [
  {
    q: "What exactly do you do for $999?",
    a: "We execute your entire product launch distribution across 6 channels: directory submissions (up to 40 sites), guest post & backlink outreach (up to 15 targets), press release writing and distribution, social influencer outreach (up to 10 profiles), Reddit community posting (up to 8 subreddits), and investor introductions (up to 10 leads). Everything is done by our team and delivered within 14 days.",
  },
  {
    q: "How do I get started?",
    a: "Click 'Hire Us' and send us a message via the contact page with your product URL, target country, and a brief description. We review every request and reply within 24 hours to confirm it's a good fit before you pay.",
  },
  {
    q: "How long does it take?",
    a: "We guarantee full execution within 14 days of receiving your completed brief and payment. Most engagements are completed in 7–10 days.",
  },
  {
    q: "Do you guarantee results?",
    a: "We guarantee execution — every action we commit to will be completed and documented. We do not guarantee specific traffic numbers, backlinks being accepted, or investor responses, as those depend on third parties. What we do guarantee is that every placement and outreach is done properly.",
  },
  {
    q: "What do I receive at the end?",
    a: "A detailed PDF/Google Doc report listing every directory submitted, every outreach email sent, every Reddit post published, and every investor contacted — with dates, links, and status (submitted, responded, live).",
  },
  {
    q: "Is this different from using the PublishRoad app myself?",
    a: "Yes. The app gives you the curated list of opportunities — you execute them yourself. The Hire Us service is us doing all the work for you. Think of it as the difference between a map and a guided tour.",
  },
  {
    q: "Do you offer refunds?",
    a: "Due to the manual nature of the work, we do not offer refunds once execution has begun. We always confirm your product is a good fit before taking payment to avoid any mismatch.",
  },
];
