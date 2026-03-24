import { PricingCard } from "@/components/public/PricingCard";
import { PlanComparisonTable } from "@/components/dashboard/billing/PlanComparisonTable";

interface PlanData {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  billingType: "free" | "one_time" | "monthly" | "lifetime";
  credits: number;
  features: string[];
}

interface PricingSectionProps {
  plans: PlanData[];
  currentPlanSlug: string;
  comparisonRows: Array<{
    feature: string;
    values: Array<string | boolean>;
  }>;
}

export function PricingSection({ plans, currentPlanSlug, comparisonRows }: PricingSectionProps) {
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            planId={plan.id}
            name={plan.name}
            slug={plan.slug}
            priceCents={plan.priceCents}
            billingType={plan.billingType}
            credits={plan.credits}
            features={plan.features}
            isPopular={plan.slug === "pro"}
            currentPlanSlug={currentPlanSlug}
            isAuthenticated={true}
          />
        ))}
      </div>

      <PlanComparisonTable rows={comparisonRows} />
    </section>
  );
}