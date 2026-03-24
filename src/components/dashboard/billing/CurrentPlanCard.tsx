import Link from "next/link";

interface CurrentPlanCardProps {
  planName: string;
  credits: string | number;
  billingType?: string | null;
  hasStripeCustomer: boolean;
  isFreePlan: boolean;
  manageBillingAction: (formData: FormData) => void | Promise<void>;
}

export function CurrentPlanCard({
  planName,
  credits,
  billingType,
  hasStripeCustomer,
  isFreePlan,
  manageBillingAction,
}: CurrentPlanCardProps) {
  return (
    <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_32px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#465FFF] mb-3">
            Your Plan
          </p>
          <h2 className="text-3xl font-bold text-gray-950 mb-2">{planName}</h2>
          <p className="text-gray-500 text-sm sm:text-base">
            {credits} curation{credits === 1 ? "" : "s"} remaining
            {billingType === "monthly"
              ? " · Renews monthly"
              : billingType === "lifetime"
              ? " · Lifetime access"
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasStripeCustomer && (
            <form action={manageBillingAction}>
              <button
                type="submit"
                className="h-11 px-5 rounded-full border border-gray-200 bg-white text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Manage Billing
              </button>
            </form>
          )}
          {isFreePlan && (
            <Link
              href="#upgrade-plans"
              className="h-11 px-6 rounded-full bg-[#465FFF] text-white text-sm font-semibold hover:bg-[#3d55e8] inline-flex items-center transition-colors"
            >
              Upgrade Plan
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}