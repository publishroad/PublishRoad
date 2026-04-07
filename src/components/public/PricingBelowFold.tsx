import Link from "next/link";
import {
  DEFAULT_PRICING_COMPARISON_ROWS,
  PricingComparisonRow,
} from "@/lib/pricing-comparison";

const PLAN_ORDER = ["free", "starter", "pro", "lifetime"] as const;
type PlanSlug = (typeof PLAN_ORDER)[number];

const PLAN_LABELS: Record<PlanSlug, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  lifetime: "Lifetime",
};

export const pricingComparisonRows = DEFAULT_PRICING_COMPARISON_ROWS;

export const pricingFaqItems = [
  {
    q: "What counts as one curation?",
    a: "A curation is one AI-powered analysis of your product. You submit your product URL, target country, keywords, and description and we return a categorised plan across up to 6 sections: Distribution Sites, Guest Post & Backlinks, Press Release Sites, Social Influencers, Reddit Communities, and Investors & Funds. Each submission uses 1 credit.",
  },
  {
    q: "What sections does each plan unlock?",
    a: "Free unlocks Steps 1 to 3 (websites) with up to 5 results per section. Starter unlocks Steps 1 to 3 fully (up to 20 results) plus Step 5 (Reddit Communities). Pro and Lifetime unlock all 6 steps including Social Influencers (Step 4) and Investors & Funds (Step 6) with up to 20 results each.",
  },
  {
    q: "What is the difference between Starter, Pro, and Lifetime?",
    a: "All three are one-time payments. Starter ($9) gives 1 curation with Steps 1 to 3 and Reddit unlocked. Pro ($39) gives 1 curation with all 6 sections unlocked, including Social Influencers and Investors & Funds. Lifetime ($599) gives 15 curations every month forever with all sections unlocked.",
  },
  {
    q: "Can I upgrade after running a free curation?",
    a: "Yes. When you upgrade, your existing curations are immediately updated to show all results for your new plan, so you do not need to re-run them.",
  },
  {
    q: "What's the refund policy?",
    a: "Due to the digital nature of our service, we do not offer refunds on any plan. We strongly recommend using the free plan first to verify the quality of results before purchasing.",
  },
];

export function PricingBelowFold({
  comparisonRows = DEFAULT_PRICING_COMPARISON_ROWS,
  visiblePlanSlugs = PLAN_ORDER,
}: {
  comparisonRows?: PricingComparisonRow[];
  visiblePlanSlugs?: readonly PlanSlug[];
}) {
  const visibleIndices = PLAN_ORDER
    .map((slug, index) => ({ slug, index }))
    .filter((item) => visiblePlanSlugs.includes(item.slug));

  const gridTemplateColumns = `minmax(170px, 1.2fr) repeat(${visibleIndices.length}, minmax(130px, 1fr))`;

  if (visibleIndices.length === 0) {
    return null;
  }

  return (
    <>
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
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns }}>
            <div className="p-5">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Feature</span>
            </div>
            {visibleIndices.map(({ slug }) => (
              <div
                key={slug}
                className="p-5 text-center"
                style={slug === "pro" ? { backgroundColor: "rgba(91,88,246,0.04)" } : {}}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: slug === "pro" ? "var(--indigo)" : "var(--dark)", fontFamily: "var(--font-heading)" }}
                >
                  {PLAN_LABELS[slug]}
                </span>
              </div>
            ))}
          </div>
          {comparisonRows.map((row, i) => (
            <div
              key={i}
              className="grid border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              style={{ gridTemplateColumns }}
            >
              <div className="p-5">
                <span className="text-sm text-slate-600 font-light">{row.feature}</span>
              </div>
              {visibleIndices.map(({ slug, index }) => {
                const val = row.values[index];
                return (
                <div
                  key={`${slug}-${i}`}
                  className="p-5 text-center"
                  style={slug === "pro" ? { backgroundColor: "rgba(91,88,246,0.04)" } : {}}
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
                );
              })}
            </div>
          ))}
        </div>
      </div>

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
            We do not offer refunds on paid plans, so we encourage you to test with the free plan first.
            You will get 1 curation with 5 results so you can verify the quality before purchasing.
            Paid plan credits are available immediately after checkout.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mb-20">
        <h2
          className="text-3xl font-bold text-center mb-10"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
        >
          Common questions
        </h2>
        <div className="space-y-4">
          {pricingFaqItems.map((item, i) => (
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
    </>
  );
}
