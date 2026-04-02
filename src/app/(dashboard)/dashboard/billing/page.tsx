// Cache billing page for 60 seconds — payment info changes are infrequent
export const revalidate = 60;

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { CurrentPlanCard } from "@/components/dashboard/billing/CurrentPlanCard";
import { PaymentHistorySection } from "@/components/dashboard/billing/PaymentHistorySection";
import { PricingSection } from "@/components/dashboard/billing/PricingSection";
import { pricingComparisonRows } from "@/components/public/PricingBelowFold";
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

async function getPlans() {
  return getCachedWithLock(CacheKeys.plans, CacheTTL.PLAN, async () => {
    return db.planConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });
}

type RecentPayment = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: Date;
  label?: string;
  plan?: {
    name: string;
  } | null;
};

async function getRecentPayments(userId: string): Promise<RecentPayment[]> {
  try {
    const payments = await db.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        createdAt: true,
        paymentType: true,
        plan: { select: { name: true } },
      },
    });

    return payments.map((payment) => ({
      ...payment,
      label: payment.paymentType === "hire_us" ? "Hire Us Service" : payment.plan?.name ?? "Subscription",
    }));
  } catch (error) {
    if ((error as { code?: string })?.code === "P2022") {
      console.warn("Billing payment history query fell back due to legacy payments schema.", error);

      const payments = await db.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amountCents: true,
          currency: true,
          status: true,
          createdAt: true,
          plan: { select: { name: true } },
        },
      });

      return payments.map((payment) => ({
        ...payment,
        label: payment.plan?.name ?? "Subscription",
      }));
    }

    throw error;
  }
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
    getRecentPayments(userId),
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
            comparisonRows={pricingComparisonRows}
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
