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

export const PRICING_PLANS: PlanDisplay[] = [
  {
    slug: "free",
    name: "Free",
    price: "$0",
    period: "",
    billingNote: "Forever free",
    credits: "1 curation included",
    popular: false,
    badge: null,
    cta: "Get Started Free",
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
    credits: "1 full curation",
    popular: false,
    badge: null,
    cta: "Get Starter",
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
    credits: "Starter included",
    popular: true,
    badge: null,
    cta: "Get Pro",
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
    credits: "15 curations / month",
    popular: false,
    badge: "Best Value",
    cta: "Get Lifetime",
    features: [
      "15 curations per month",
      "Up to 20 results per section",
      "All 6 sections unlocked",
      "All future features included",
      "Priority support",
    ],
  },
];
