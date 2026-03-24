interface PlanComparisonTableProps {
  rows: Array<{
    feature: string;
    values: Array<string | boolean>;
  }>;
}

export function PlanComparisonTable({ rows }: PlanComparisonTableProps) {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-[2rem] overflow-hidden border border-gray-200 shadow-[0_8px_32px_rgba(15,23,42,0.04)]">
      <div className="grid grid-cols-5 border-b border-slate-100 bg-slate-50/70">
        <div className="col-span-1 p-5">
          <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Feature</span>
        </div>
        {["Free", "Starter", "Pro", "Lifetime"].map((name) => (
          <div
            key={name}
            className="p-5 text-center"
            style={name === "Pro" ? { backgroundColor: "rgba(91,88,246,0.04)" } : {}}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: name === "Pro" ? "var(--indigo)" : "var(--dark)", fontFamily: "var(--font-heading)" }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-5 border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
        >
          <div className="col-span-1 p-5">
            <span className="text-sm text-slate-600 font-light">{row.feature}</span>
          </div>
          {row.values.map((value, valueIndex) => (
            <div
              key={valueIndex}
              className="p-5 text-center"
              style={valueIndex === 2 ? { backgroundColor: "rgba(91,88,246,0.04)" } : {}}
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
          ))}
        </div>
      ))}
    </div>
  );
}