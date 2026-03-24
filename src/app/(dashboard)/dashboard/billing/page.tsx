// Cache billing page for 60 seconds — payment info changes are infrequent
export const revalidate = 60;

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { CurrentPlanCard } from "@/components/dashboard/billing/CurrentPlanCard";
import { PaymentHistorySection } from "@/components/dashboard/billing/PaymentHistorySection";
import { PricingSection } from "@/components/dashboard/billing/PricingSection";
import { auth } from "@/lib/auth";
import { CacheKeys, CacheTTL, getCachedWithLock } from "@/lib/cache";
import { db } from "@/lib/db";

const fallbackPlans = [
  {
    id: "free",
    name: "Free",
    slug: "free",
    priceCents: 0,
    billingType: "free" as const,
    credits: 1,
    features: ["1 curation", "5 results shown", "All 3 sections", "Basic filtering"],
  },
  {
    id: "starter",
    name: "Starter",
    slug: "starter",
    priceCents: 900,
    billingType: "one_time" as const,
    credits: 1,
    features: ["1 full curation", "50+ results", "All 3 sections", "Export results"],
  },
  {
    id: "pro",
    name: "Pro",
    slug: "pro",
    priceCents: 3900,
    billingType: "monthly" as const,
    credits: 10,
    features: ["10 curations/month", "50+ results each", "Priority AI matching", "Export results", "Email notifications"],
  },
  {
    id: "lifetime",
    name: "Lifetime",
    slug: "lifetime",
    priceCents: 59900,
    billingType: "lifetime" as const,
    credits: -1,
    features: ["Unlimited curations", "50+ results each", "Priority AI matching", "All future features", "Priority support"],
  },
];

const comparisonRows = [
  { feature: "Curations included", values: ["1", "1", "10/mo", "Unlimited"] },
  { feature: "Results per curation", values: ["5 (masked)", "50+", "50+", "50+"] },
  { feature: "Distribution sites (A)", values: [true, true, true, true] },
  { feature: "Guest post sites (B)", values: [true, true, true, true] },
  { feature: "Press release sites (C)", values: [true, true, true, true] },
  { feature: "Country targeting", values: [true, true, true, true] },
  { feature: "Export results", values: [false, true, true, true] },
  { feature: "Priority AI matching", values: [false, false, true, true] },
  { feature: "Email notifications", values: [false, false, true, true] },
  { feature: "All future features", values: [false, false, false, true] },
  { feature: "Priority support", values: [false, false, false, true] },
];

async function getPlans() {
  return getCachedWithLock(CacheKeys.plans, CacheTTL.PLAN, async () => {
    return db.planConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });
}

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [user, recentPayments, dbPlans] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    }),
    db.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { plan: { select: { name: true } } },
    }),
    getPlans(),
  ]);

  const hasStripeCustomer = !!user?.stripeCustomerId;
  const plans = dbPlans.length > 0 ? dbPlans : fallbackPlans;
  const planName = user?.plan?.name ?? "Free";
  const isFreePlan = user?.plan?.slug === "free" || !user?.plan;
  const credits = user?.creditsRemaining === -1 ? "Unlimited" : user?.creditsRemaining ?? 0;

  async function handleManageBilling() {
    "use server";

    if (!hasStripeCustomer) {
      redirect("/dashboard/billing");
    }

    redirect("/api/payments/portal-redirect");
  }

  return (
    <>
      <AppHeader title="Billing" />
      <div className="flex-1 bg-[#f8fafc]">
        <div className="px-6 py-10 max-w-[1280px] mx-auto w-full space-y-10">
          <CurrentPlanCard
            planName={planName}
            credits={credits}
            billingType={user?.plan?.billingType}
            hasStripeCustomer={hasStripeCustomer}
            isFreePlan={isFreePlan}
            manageBillingAction={handleManageBilling}
          />

          <PricingSection
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              slug: plan.slug,
              priceCents: plan.priceCents,
              billingType: plan.billingType as "free" | "one_time" | "monthly" | "lifetime",
              credits: plan.credits,
              features: (plan.features as string[]) ?? [],
            }))}
            currentPlanSlug={user?.plan?.slug ?? "free"}
            comparisonRows={comparisonRows}
          />

          <PaymentHistorySection payments={recentPayments} />

          <p className="text-xs text-gray-400 text-center max-w-3xl mx-auto">
            All sales are final. No refunds are offered on any plan or service.{" "}
            <Link href="/terms" className="text-[#465FFF] hover:underline">
              View Terms
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
