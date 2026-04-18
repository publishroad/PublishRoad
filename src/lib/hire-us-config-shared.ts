export type HireUsPackageSlug = "starter" | "complete";

export type HireUsPricingPackageConfig = {
  priceCents: number;
  compareAtPriceCents: number | null;
  includes: string[];
};

export type HireUsFaqItem = {
  q: string;
  a: string;
};

export type HireUsPricingConfig = {
  starter: HireUsPricingPackageConfig;
  complete: HireUsPricingPackageConfig;
  faq: HireUsFaqItem[];
};

const MAX_FEATURES = 12;
const MAX_FEATURE_LENGTH = 180;
const MAX_FAQ_ITEMS = 10;
const MAX_FAQ_Q_LENGTH = 160;
const MAX_FAQ_A_LENGTH = 600;

export const DEFAULT_HIRE_US_PRICING_CONFIG: HireUsPricingConfig = {
  starter: {
    priceCents: 39900,
    compareAtPriceCents: null,
    includes: [
      "Submissions to all sites on your curated distribution list",
      "Full execution report with all submission links",
      "15-day delivery guarantee",
    ],
  },
  complete: {
    priceCents: 99900,
    compareAtPriceCents: null,
    includes: [
      "Everything in the Starter package",
      "Guest posts on up to 20 sites from your curation list",
      "Direct introduction to our press release team",
      "Press release may be included free or charged separately by tier",
      "Full execution report with all submissions & published links",
      "25-day delivery guarantee",
    ],
  },
  faq: [
    {
      q: "What's the difference between the two packages?",
      a: "The Starter package covers directory submissions. The Complete package includes everything in Starter plus guest posts and press release support.",
    },
    {
      q: "Which package should I choose?",
      a: "If you mainly need visibility through directory listings, Starter is the right pick. If you also want SEO-focused guest posts and press release support, choose Complete.",
    },
    {
      q: "How long does it take?",
      a: "Starter is delivered within 15 days. Complete is delivered within 25 days. Both timelines begin once we receive your brief and payment.",
    },
    {
      q: "How does the press release work?",
      a: "We introduce you to our press release partners and explain the available tiers. Depending on the distribution scope you choose, the press release may be included at no extra charge or require a separate fee.",
    },
  ],
};

function normalizePriceCents(input: unknown, fallback: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return fallback;
  const rounded = Math.round(input);
  if (rounded < 100 || rounded > 5000000) return fallback;
  return rounded;
}

function normalizeCompareAtPriceCents(input: unknown, fallback: number | null, priceCents: number): number | null {
  if (input === null) return null;
  if (input === undefined) {
    if (fallback !== null && fallback >= priceCents) return fallback;
    return null;
  }
  if (typeof input !== "number" || !Number.isFinite(input)) {
    if (fallback !== null && fallback >= priceCents) return fallback;
    return null;
  }

  const rounded = Math.round(input);
  if (rounded < 100 || rounded > 5000000) {
    if (fallback !== null && fallback >= priceCents) return fallback;
    return null;
  }

  return rounded >= priceCents ? rounded : null;
}

function normalizeIncludes(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return [...fallback];

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const clipped = trimmed.slice(0, MAX_FEATURE_LENGTH);
    if (seen.has(clipped)) continue;
    seen.add(clipped);
    normalized.push(clipped);
    if (normalized.length >= MAX_FEATURES) break;
  }

  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeFaq(input: unknown, fallback: HireUsFaqItem[]): HireUsFaqItem[] {
  if (!Array.isArray(input)) return [...fallback];

  const normalized: HireUsFaqItem[] = [];

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const q = typeof item.q === "string" ? item.q.trim().slice(0, MAX_FAQ_Q_LENGTH) : "";
    const a = typeof item.a === "string" ? item.a.trim().slice(0, MAX_FAQ_A_LENGTH) : "";
    if (!q || !a) continue;
    normalized.push({ q, a });
    if (normalized.length >= MAX_FAQ_ITEMS) break;
  }

  return normalized.length > 0 ? normalized : [...fallback];
}

export function normalizeHireUsPricingConfig(input: unknown): HireUsPricingConfig {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const starterRaw = typeof value.starter === "object" && value.starter !== null
    ? (value.starter as Record<string, unknown>)
    : {};
  const completeRaw = typeof value.complete === "object" && value.complete !== null
    ? (value.complete as Record<string, unknown>)
    : {};

  const starterPriceCents = normalizePriceCents(starterRaw.priceCents, DEFAULT_HIRE_US_PRICING_CONFIG.starter.priceCents);
  const completePriceCents = normalizePriceCents(completeRaw.priceCents, DEFAULT_HIRE_US_PRICING_CONFIG.complete.priceCents);

  return {
    starter: {
      priceCents: starterPriceCents,
      compareAtPriceCents: normalizeCompareAtPriceCents(
        starterRaw.compareAtPriceCents,
        DEFAULT_HIRE_US_PRICING_CONFIG.starter.compareAtPriceCents,
        starterPriceCents
      ),
      includes: normalizeIncludes(starterRaw.includes, DEFAULT_HIRE_US_PRICING_CONFIG.starter.includes),
    },
    complete: {
      priceCents: completePriceCents,
      compareAtPriceCents: normalizeCompareAtPriceCents(
        completeRaw.compareAtPriceCents,
        DEFAULT_HIRE_US_PRICING_CONFIG.complete.compareAtPriceCents,
        completePriceCents
      ),
      includes: normalizeIncludes(completeRaw.includes, DEFAULT_HIRE_US_PRICING_CONFIG.complete.includes),
    },
    faq: normalizeFaq(value.faq, DEFAULT_HIRE_US_PRICING_CONFIG.faq),
  };
}

export function formatUsdFromCents(priceCents: number): string {
  return `$${Math.round(priceCents / 100)}`;
}
