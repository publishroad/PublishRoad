// Cache pricing for 300 seconds — changes are infrequent
export const revalidate = 0;
import { db } from "@/lib/db";
import { PricingAdminForm } from "@/components/admin/PricingAdminForm";
import { AppHeader } from "@/components/dashboard/AppHeader";

export default async function AdminPricingPage() {
  const plans = await db.planConfig.findMany({ orderBy: { priceCents: "asc" } });
  return (
    <>
      <AppHeader title="Pricing Plans" />
      <div className="flex-1 p-6 max-w-4xl">
        <p className="text-sm text-gray-400 mb-6">Changes sync with Stripe and trigger ISR revalidation of /pricing.</p>
        <PricingAdminForm plans={plans} />
      </div>
    </>
  );
}
