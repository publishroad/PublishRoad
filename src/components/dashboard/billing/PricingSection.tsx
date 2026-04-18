import { PricingCard } from "@/components/public/PricingCard";
import { PlanComparisonTable } from "@/components/dashboard/billing/PlanComparisonTable";
import { PricingComparisonRow } from "@/lib/pricing-comparison";

interface PlanData {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  billingType: "free" | "one_time" | "monthly" | "lifetime";
  credits: number;
  features: string[];
}

interface PricingSectionProps {
  plans: PlanData[];
  currentPlanSlug: string;
  comparisonRows: PricingComparisonRow[];
  visiblePlanSlugs?: Array<"free" | "starter" | "pro" | "lifetime">;
}

function getPricingGridClasses(planCount: number): string {
  if (planCount <= 1) return "grid-cols-1 max-w-sm";
  if (planCount === 2) return "grid-cols-1 sm:grid-cols-2 max-w-3xl";
  if (planCount === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-6xl";
}

export function PricingSection({
  plans,
  currentPlanSlug,
  comparisonRows,
  visiblePlanSlugs,
}: PricingSectionProps) {
  const pricingGridClasses = getPricingGridClasses(plans.length);

  return (
    <section id="upgrade-plans" className="scroll-mt-24">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#465FFF] mb-3">
          Upgrade Inside Dashboard
        </p>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-950 mb-4" style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
          Pricing without the clutter
        </h2>
        <p className="text-slate-500 text-base sm:text-lg font-light">
          Pick the plan that fits your launch volume. You stay inside your dashboard and go straight to checkout.
        </p>
      </div>

      <div className={`grid gap-6 mx-auto mb-12 w-full ${pricingGridClasses}`}>
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            planId={plan.id}
            name={plan.name}
            slug={plan.slug}
            priceCents={plan.priceCents}
            compareAtPriceCents={plan.compareAtPriceCents}
            billingType={plan.billingType}
            credits={plan.credits}
            features={plan.features}
            isPopular={plan.slug === "pro"}
            currentPlanSlug={currentPlanSlug}
            isAuthenticated={true}
          />
        ))}
      </div>

      <PlanComparisonTable rows={comparisonRows} visiblePlanSlugs={visiblePlanSlugs} />
    </section>
  );
}