export type PricingComparisonValue = string | boolean;

export interface PricingComparisonRow {
  feature: string;
  values: [PricingComparisonValue, PricingComparisonValue, PricingComparisonValue, PricingComparisonValue];
}

export const PRICING_COMPARISON_MAX_ROWS = 30;
export const PRICING_COMPARISON_MAX_FEATURE_LENGTH = 80;
export const PRICING_COMPARISON_MAX_VALUE_LENGTH = 60;

export const DEFAULT_PRICING_COMPARISON_ROWS: PricingComparisonRow[] = [
  { feature: "Curations included", values: ["1", "1", "1 + all sections", "15/month"] },
  { feature: "Results per section", values: ["Up to 5", "Up to 20", "Up to 20", "Up to 20"] },
  { feature: "Distribution Sites", values: [true, true, true, true] },
  { feature: "Guest Post & Backlinks", values: [true, true, true, true] },
  { feature: "Press Release Sites", values: [true, true, true, true] },
  { feature: "Social Influencers", values: [false, false, true, true] },
  { feature: "Reddit Communities", values: [false, true, true, true] },
  { feature: "Investors & Funds", values: [false, false, true, true] },
  { feature: "Country targeting", values: [true, true, true, true] },
  { feature: "AI-powered matching", values: [true, true, true, true] },
  { feature: "Credits roll over", values: [false, false, false, true] },
  { feature: "All future features", values: [false, false, false, true] },
  { feature: "Priority support", values: [false, false, false, true] },
];

const TRUE_TOKENS = new Set(["yes", "y", "true", "check", "checked", "\u2713", "\u2714"]);
const FALSE_TOKENS = new Set(["no", "n", "false", "x", "\u2715", "\u2716", "\u2717"]);

function cloneDefaultRows(): PricingComparisonRow[] {
  return DEFAULT_PRICING_COMPARISON_ROWS.map((row) => ({
    feature: row.feature,
    values: [...row.values] as PricingComparisonRow["values"],
  }));
}

function normalizeSingleValue(raw: unknown): PricingComparisonValue | null {
  if (typeof raw === "boolean") return raw;

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    const text = String(raw);
    return text.length <= PRICING_COMPARISON_MAX_VALUE_LENGTH ? text : null;
  }

  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const token = trimmed.toLowerCase();
  if (TRUE_TOKENS.has(token)) return true;
  if (FALSE_TOKENS.has(token)) return false;

  return trimmed.length <= PRICING_COMPARISON_MAX_VALUE_LENGTH ? trimmed : null;
}

function normalizeRow(raw: unknown): PricingComparisonRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const row = raw as { feature?: unknown; values?: unknown };
  if (typeof row.feature !== "string") return null;

  const feature = row.feature.trim();
  if (!feature || feature.length > PRICING_COMPARISON_MAX_FEATURE_LENGTH) return null;

  if (!Array.isArray(row.values) || row.values.length !== 4) return null;

  const values: PricingComparisonValue[] = [];
  for (const value of row.values) {
    const normalized = normalizeSingleValue(value);
    if (normalized === null) return null;
    values.push(normalized);
  }

  return {
    feature,
    values: values as PricingComparisonRow["values"],
  };
}

export function normalizePricingComparisonRows(input: unknown): PricingComparisonRow[] {
  if (!Array.isArray(input)) return cloneDefaultRows();

  const normalized: PricingComparisonRow[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const row = normalizeRow(raw);
    if (!row) continue;

    const key = row.feature.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(row);

    if (normalized.length >= PRICING_COMPARISON_MAX_ROWS) break;
  }

  return normalized.length > 0 ? normalized : cloneDefaultRows();
}

export function valueToEditorText(value: PricingComparisonValue): string {
  return typeof value === "boolean" ? (value ? "yes" : "no") : value;
}
