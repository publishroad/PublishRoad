"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type ChartPoint = {
  month: string;
  planRevenue: number;
  hireUsRevenue: number;
};

function dollarFormatter(value: number): string {
  if (value >= 100000) return `$${(value / 100000).toFixed(0)}k`;
  if (value >= 1000) return `$${(value / 100).toFixed(0)}`;
  return `$${(value / 100).toFixed(2)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v / 100);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-gray-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium text-gray-900">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-52 text-sm text-gray-400">
        No revenue data for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={4} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={dollarFormatter}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value) => (
            <span className="text-gray-600">{value}</span>
          )}
        />
        <Bar dataKey="planRevenue" name="Credit Plans" fill="#465FFF" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="hireUsRevenue" name="Hire Us" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
