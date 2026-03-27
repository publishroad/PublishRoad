import { db } from "@/lib/db";
import { getCachedWithLock, CacheKeys, CacheTTL } from "@/lib/cache";
import { PublicPricingCard } from "@/components/public/PublicPricingCard";
import { PRICING_PLANS, dbPlanToDisplay } from "@/lib/pricing-plans";
import { auth } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://publishroad.com";

export const metadata: Metadata = {
  title: "Pricing — Free, Starter, Pro & Lifetime Plans | PublishRoad",
  description:
    "Simple, transparent pricing. Start free with 1 curation. Upgrade to Starter ($9), Pro ($39/month), or Lifetime ($599) for full access to distribution sites, influencers, Reddit, and investors.",
  alternates: { canonical: `${APP_URL}/pricing` },
  openGraph: {
    title: "Pricing — Free, Starter, Pro & Lifetime Plans | PublishRoad",
    description:
      "Start free. Get full AI-powered distribution plans with Starter from $9. Pro from $39/month. Lifetime deal at $599.",
    url: `${APP_URL}/pricing`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PublishRoad Pricing" }],
  },
};

export const revalidate = 30;

async function getPlans() {
  try {
    return await getCachedWithLock(CacheKeys.plans, CacheTTL.PLAN, async () => {
      return db.planConfig.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    });
  } catch (error) {
    console.error("Error fetching plans", error);
    return [];
  }
}

async function getOptionalSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}


export default async function PricingPage() {
  const [dbPlans, session] = await Promise.all([getPlans(), getOptionalSession()]);

  const currentPlanSlug = session?.user?.planSlug;

  const plans = dbPlans;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* ─── Header ─── */}
      <div className="bg-mesh relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
            Pricing
          </p>
          <h1
            className="text-5xl sm:text-6xl font-bold mb-5"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
          >
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto font-light">
            Start with a free curation to see how it works. Upgrade when you&apos;re ready for more.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* ─── Pricing Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-20">
          {(plans.length > 0 ? plans : PRICING_PLANS).map((p) => {
            const displayPlan = "priceCents" in p ? dbPlanToDisplay(p) : p;
            const planId = "id" in p ? (p as { id: string }).id : undefined;
            return (
              <PublicPricingCard
                key={displayPlan.slug}
                plan={displayPlan}
                planId={planId}
                currentPlanSlug={currentPlanSlug}
                isAuthenticated={!!session?.user?.id}
              />
            );
          })}
        </div>

        {/* ─── Feature Comparison ─── */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2
            className="text-3xl font-bold text-center mb-10"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
          >
            Compare plans
          </h2>
          <div
            className="bg-white rounded-[2rem] overflow-hidden"
            style={{ boxShadow: "0 4px 32px rgba(91,88,246,0.08)", border: "1px solid rgba(226,232,240,0.8)" }}
          >
            {/* Header row */}
            <div className="grid grid-cols-5 border-b border-slate-100">
              <div className="col-span-1 p-5">
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Feature</span>
              </div>
              {["Free", "Starter", "Pro", "Lifetime"].map((name) => (
                <div
                  key={name}
                  className="p-5 text-center"
                  style={name === "Pro" ? { backgroundColor: "rgba(91,88,246,0.04)" } : {}}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{ color: name === "Pro" ? "var(--indigo)" : "var(--dark)", fontFamily: "var(--font-heading)" }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
            {comparisonRows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              >
                <div className="col-span-1 p-5">
                  <span className="text-sm text-slate-600 font-light">{row.feature}</span>
                </div>
                {row.values.map((val, j) => (
                  <div
                    key={j}
                    className="p-5 text-center"
                    style={j === 2 ? { backgroundColor: "rgba(91,88,246,0.04)" } : {}}
                  >
                    {typeof val === "boolean" ? (
                      val ? (
                        <svg className="w-5 h-5 mx-auto" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mx-auto text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )
                    ) : (
                      <span className="text-sm text-slate-600 font-light">{val}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Guarantee / Refund Note ─── */}
        <div
          className="max-w-3xl mx-auto rounded-[2rem] p-8 flex flex-col sm:flex-row items-center gap-6 mb-20"
          style={{
            background: "rgba(91,88,246,0.06)",
            border: "1px solid rgba(91,88,246,0.15)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(91,88,246,0.12)" }}
          >
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <h3
              className="font-semibold text-lg mb-1"
              style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
            >
              Try it risk-free with the free plan
            </h3>
            <p className="text-slate-500 text-sm font-light leading-relaxed">
              We don&apos;t offer refunds on paid plans — so we encourage you to test with the free plan first.
              You&apos;ll get 1 curation with 5 results so you can verify the quality before purchasing.
              Paid plan credits are available immediately after checkout.
            </p>
          </div>
        </div>

        {/* ─── FAQ ─── */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2
            className="text-3xl font-bold text-center mb-10"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
          >
            Common questions
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6"
                style={{ boxShadow: "0 2px 12px rgba(91,88,246,0.05)", border: "1px solid rgba(226,232,240,0.8)" }}
              >
                <h3
                  className="font-semibold mb-2"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
                >
                  {item.q}
                </h3>
                <p className="text-slate-500 text-sm font-light leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Bottom CTA ─── */}
        <div
          className="max-w-3xl mx-auto rounded-[2rem] p-12 text-center relative overflow-hidden"
          style={{ backgroundColor: "var(--dark)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(91,88,246,0.25) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <h2
              className="text-3xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Still not sure?
            </h2>
            <p className="text-slate-400 font-light mb-8">
              Start with the free plan. No credit card, no commitment.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <button
                  className="rounded-full px-8 h-12 text-base font-medium text-white btn-glow transition-all"
                  style={{ backgroundColor: "var(--indigo)" }}
                >
                  Start for Free →
                </button>
              </Link>
              <Link href="/contact">
                <button
                  className="rounded-full px-8 h-12 text-base font-medium text-white border border-white/20 hover:bg-white/10 transition-all"
                >
                  Talk to Us
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── FAQ link ─── */}
        <div className="text-center mt-10">
          <p className="text-slate-500 font-light">
            More questions?{" "}
            <Link href="/faq" className="hover:underline font-medium" style={{ color: "var(--indigo)" }}>
              Check our full FAQ
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="hover:underline font-medium" style={{ color: "var(--indigo)" }}>
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

const comparisonRows = [
  { feature: "Curations included", values: ["1", "1", "1 + all sections", "15/month"] },
  { feature: "Results per section", values: ["Up to 5", "Up to 20", "Up to 20", "Up to 20"] },
  { feature: "Distribution Sites", values: [true, true, true, true] },
  { feature: "Guest Post & Backlinks", values: [true, true, true, true] },
  { feature: "Press Release Sites", values: [true, true, true, true] },
  { feature: "Social Influencers", values: [false, false, true, true] },
  { feature: "Reddit Communities", values: [false, true, true, true] },
  { feature: "Investors & Funds", values: [false, false, true, true] },
  { feature: "Country targeting", values: [true, true, true, true] },
  { feature: "AI-powered matching", values: [true, true, true, true] },
  { feature: "Credits roll over", values: [false, false, false, true] },
  { feature: "All future features", values: [false, false, false, true] },
  { feature: "Priority support", values: [false, false, false, true] },
];

const faqItems = [
  {
    q: "What counts as one curation?",
    a: "A curation is one AI-powered analysis of your product. You submit your product URL, target country, keywords, and description — we return a categorised plan across up to 6 sections: Distribution Sites, Guest Post & Backlinks, Press Release Sites, Social Influencers, Reddit Communities, and Investors & Funds. Each submission uses 1 credit.",
  },
  {
    q: "What sections does each plan unlock?",
    a: "Free unlocks Steps 1–3 (websites) with up to 5 results per section. Starter unlocks Steps 1–3 fully (up to 20 results) plus Step 5 (Reddit Communities). Pro and Lifetime unlock all 6 steps including Social Influencers (Step 4) and Investors & Funds (Step 6) with up to 20 results each.",
  },
  {
    q: "What is the difference between Starter, Pro, and Lifetime?",
    a: "All three are one-time payments. Starter ($9) gives 1 curation with Steps 1–3 and Reddit unlocked. Pro ($39) gives 1 curation with all 6 sections unlocked — including Social Influencers and Investors & Funds. Lifetime ($599) gives you 15 curations every month, forever, with all sections unlocked.",
  },
  {
    q: "Can I upgrade after running a free curation?",
    a: "Yes. When you upgrade, your existing curations are immediately updated to show all results for your new plan — you don't need to re-run them.",
  },
  {
    q: "What's the refund policy?",
    a: "Due to the digital nature of our service, we do not offer refunds on any plan. We strongly recommend using the free plan first to verify the quality of results before purchasing.",
  },
];
