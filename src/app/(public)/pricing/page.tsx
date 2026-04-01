import { db } from "@/lib/db";
import { PublicPricingCard } from "@/components/public/PublicPricingCard";
import { pricingFaqItems } from "@/components/public/PricingBelowFold";
import { PRICING_PLANS, dbPlanToDisplay } from "@/lib/pricing-plans";
import Link from "next/link";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import dynamic from "next/dynamic";
import { buildTwitterMetadata, getSiteUrl, getSocialImages } from "@/lib/seo";

const APP_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Pricing — Free, Starter, Pro & Lifetime Plans",
  description:
    "Simple, transparent pricing. Start free with 1 curation. Upgrade to Starter ($9), Pro ($39/month), or Lifetime ($599) for full access to distribution sites, influencers, Reddit, and investors.",
  alternates: { canonical: `${APP_URL}/pricing` },
  openGraph: {
    title: "Pricing — Free, Starter, Pro & Lifetime Plans",
    description:
      "Start free. Get full AI-powered distribution plans with Starter from $9. Pro from $39/month. Lifetime deal at $599.",
    url: `${APP_URL}/pricing`,
    type: "website",
    siteName: "PublishRoad",
    images: getSocialImages("PublishRoad Pricing"),
  },
  twitter: buildTwitterMetadata({
    title: "Pricing — Free, Starter, Pro & Lifetime Plans",
    description:
      "Start free. Get full AI-powered distribution plans with Starter from $9. Pro from $39/month. Lifetime deal at $599.",
  }),
};

export const revalidate = 300;

const getPlans = unstable_cache(
  async () => {
    try {
      return db.planConfig.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });
    } catch (error) {
      console.error("Error fetching plans", error);
      return [];
    }
  },
  ["public-pricing-plans"],
  { revalidate }
);

const pricingFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: pricingFaqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

const DeferredPricingBelowFold = dynamic(
  async () => {
    const mod = await import("@/components/public/PricingBelowFold");
    return mod.PricingBelowFold;
  },
  {
    loading: () => (
      <div className="max-w-4xl mx-auto mt-12 text-center text-sm text-slate-500">
        Loading plan comparison and FAQs...
      </div>
    ),
  }
);

export default async function PricingPage() {
  const dbPlans = await getPlans();

  const plans = dbPlans;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema) }}
      />
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
              />
            );
          })}
        </div>

        <DeferredPricingBelowFold />
      </div>
    </div>
  );
}

