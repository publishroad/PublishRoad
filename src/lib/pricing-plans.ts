export interface PlanDisplay {
  slug: string;
  name: string;
  price: string;
  period: string;
  billingNote: string;
  credits: string;
  popular: boolean;
  badge: string | null;
  cta: string;
  features: string[];
}

// Static-only metadata: which card is "popular", badge text, CTA label.
// Everything else (price, credits, features) comes from the database.
const PLAN_STATIC: Record<string, { popular: boolean; badge: string | null; cta: string }> = {
  free:     { popular: false, badge: null,         cta: "Get Started Free" },
  starter:  { popular: false, badge: null,         cta: "Get Starter" },
  pro:      { popular: true,  badge: null,         cta: "Get Pro" },
  lifetime: { popular: false, badge: "Best Value", cta: "Get Lifetime" },
};

/** Convert a DB PlanConfig row into a PlanDisplay for rendering. */
export function dbPlanToDisplay(dbPlan: {
  slug: string;
  name: string;
  priceCents: number;
  credits: number;
  billingType: string;
  features: unknown;
}): PlanDisplay {
  const stat = PLAN_STATIC[dbPlan.slug] ?? { popular: false, badge: null, cta: `Get ${dbPlan.name}` };

  const price = dbPlan.priceCents === 0 ? "$0" : `$${Math.floor(dbPlan.priceCents / 100)}`;
  const period = dbPlan.billingType === "monthly" ? "/mo" : "";
  const billingNote =
    dbPlan.priceCents === 0 ? "Forever free" :
    dbPlan.billingType === "monthly" ? "Billed monthly" :
    dbPlan.billingType === "lifetime" ? "One-time, forever" :
    "One-time payment";

  const credits =
    dbPlan.credits === -1 ? "Unlimited curations" :
    dbPlan.billingType === "lifetime" || dbPlan.billingType === "monthly"
      ? `${dbPlan.credits} curations/month`
      : dbPlan.credits === 1 ? "1 curation included"
      : `${dbPlan.credits} curations`;

  const features = Array.isArray(dbPlan.features)
    ? dbPlan.features.filter((feature): feature is string => typeof feature === "string")
    : [];

  return { slug: dbPlan.slug, name: dbPlan.name, price, period, billingNote, credits, features, ...stat };
}

// Fallback display plans — used ONLY when the DB is unreachable.
export const PRICING_PLANS: PlanDisplay[] = [
  {
    slug: "free",
    name: "Free",
    price: "$0",
    period: "",
    billingNote: "Forever free",
    credits: "1 curation included",
    ...PLAN_STATIC.free,
    features: [
      "1 curation",
      "Up to 5 results per section",
      "Distribution Sites",
      "Guest Post & Backlink Sites",
      "Press Release Sites",
      "Social, Reddit & Investors locked",
    ],
  },
  {
    slug: "starter",
    name: "Starter",
    price: "$9",
    period: "",
    billingNote: "One-time payment",
    credits: "1 curation included",
    ...PLAN_STATIC.starter,
    features: [
      "1 full curation",
      "Up to 20 results per section",
      "Distribution, Guest Post & Press Sites",
      "Reddit Communities",
      "Social Influencers & Investors locked",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    price: "$39",
    period: "",
    billingNote: "One-time payment",
    credits: "1 full curation",
    ...PLAN_STATIC.pro,
    features: [
      "Everything in Starter",
      "Up to 20 results per section",
      "All 6 sections unlocked",
      "Social Influencers",
      "Reddit Communities",
      "Investors & Funds",
    ],
  },
  {
    slug: "lifetime",
    name: "Lifetime",
    price: "$599",
    period: "",
    billingNote: "One-time, forever",
    credits: "15 curations/month",
    ...PLAN_STATIC.lifetime,
    features: [
      "15 curations per month",
      "Up to 20 results per section",
      "All 6 sections unlocked",
      "All future features included",
      "Priority support",
    ],
  },
];
