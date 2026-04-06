// Cache pricing for 300 seconds — changes are infrequent
export const revalidate = 0;
import { db } from "@/lib/db";
import { PricingAdminForm } from "@/components/admin/PricingAdminForm";
import { PricingComparisonEditor } from "@/components/admin/PricingComparisonEditor";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { normalizePricingComparisonRows } from "@/lib/pricing-comparison";

export default async function AdminPricingPage() {
  const [plans, betaConfig] = await Promise.all([
    db.planConfig.findMany({ orderBy: { priceCents: "asc" } }),
    db.betaConfig.findUnique({ where: { id: "default" } }),
  ]);

  const freePlanFullAccessEnabled = betaConfig?.enabled ?? false;
  let comparisonRows = normalizePricingComparisonRows([]);
  try {
    const rows = await db.$queryRaw<Array<{ pricing_comparison_rows: unknown }>>`
      SELECT pricing_comparison_rows
      FROM beta_config
      WHERE id = 'default'
      LIMIT 1
    `;
    comparisonRows = normalizePricingComparisonRows(rows[0]?.pricing_comparison_rows ?? []);
  } catch {
    comparisonRows = normalizePricingComparisonRows([]);
  }

  return (
    <>
      <AppHeader title="Pricing Plans" />
      <div className="flex-1 p-6 max-w-4xl">
        <p className="text-sm text-gray-400 mb-6">Changes sync with Stripe and trigger ISR revalidation of /pricing.</p>

        <div className="mb-6 rounded-xl border border-border-gray bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-navy">Launch Mode:</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                freePlanFullAccessEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {freePlanFullAccessEnabled ? "Free Full Access: ON" : "Free Full Access: OFF"}
            </span>
          </div>
        </div>

        <PricingAdminForm
          plans={plans}
          initialFreePlanFullAccessEnabled={freePlanFullAccessEnabled}
        />

        <PricingComparisonEditor initialRows={comparisonRows} />
      </div>
    </>
  );
}
