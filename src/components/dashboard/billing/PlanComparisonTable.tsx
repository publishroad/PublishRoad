import { PricingComparisonRow } from "@/lib/pricing-comparison";

const PLAN_ORDER = ["free", "starter", "pro", "lifetime"] as const;
type PlanSlug = (typeof PLAN_ORDER)[number];

const PLAN_LABELS: Record<PlanSlug, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  lifetime: "Lifetime",
};

interface PlanComparisonTableProps {
  rows: PricingComparisonRow[];
  visiblePlanSlugs?: readonly PlanSlug[];
}

export function PlanComparisonTable({
  rows,
  visiblePlanSlugs = PLAN_ORDER,
}: PlanComparisonTableProps) {
  const visibleIndices = PLAN_ORDER
    .map((slug, index) => ({ slug, index }))
    .filter((item) => visiblePlanSlugs.includes(item.slug));

  if (visibleIndices.length === 0) {
    return null;
  }

  const gridTemplateColumns = `minmax(170px, 1.2fr) repeat(${visibleIndices.length}, minmax(130px, 1fr))`;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-[2rem] overflow-hidden border border-gray-200 shadow-[0_8px_32px_rgba(15,23,42,0.04)]">
      <div className="grid border-b border-slate-100 bg-slate-50/70" style={{ gridTemplateColumns }}>
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
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
          style={{ gridTemplateColumns }}
        >
          <div className="p-5">
            <span className="text-sm text-slate-600 font-light">{row.feature}</span>
          </div>
          {visibleIndices.map(({ slug, index: valueIndex }) => {
            const value = row.values[valueIndex];
            return (
              <div
                key={`${slug}-${index}`}
                className="p-5 text-center"
                style={slug === "pro" ? { backgroundColor: "rgba(91,88,246,0.04)" } : {}}
              >
                {typeof value === "boolean" ? (
                  value ? (
                    <svg className="w-5 h-5 mx-auto" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mx-auto text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )
                ) : (
                  <span className="text-sm text-slate-600 font-light">{value}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}