import Link from "next/link";

interface UpsellBannerProps {
  maskedCount: number;
  planSlug: string;
}

export function UpsellBanner({ maskedCount, planSlug }: UpsellBannerProps) {
  if (planSlug !== "free" && planSlug !== "starter") return null;
  if (maskedCount === 0) return null;

  const isFree = planSlug === "free";

  const heading = isFree
    ? `${maskedCount} results are hidden on the Free plan`
    : `${maskedCount} results are locked on your current plan`;

  const body = isFree
    ? "Upgrade to Starter to unlock all Distribution, Guest Post, and Reddit results. Upgrade to Pro to unlock Social Influencers and Investors too."
    : "Upgrade to Pro to unlock Social Influencer and Investor & Fund sections with up to 20 results each.";

  const ctaLabel = isFree ? "Upgrade to Starter" : "Upgrade to Pro";

  return (
    <div className="bg-gradient-to-r from-navy to-blue rounded-xl p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-base mb-1">{heading}</p>
          <p className="text-white/75 text-sm">{body}</p>
        </div>
        <Link
          href="/dashboard/billing"
          style={{
            display: "inline-block", borderRadius: "999px",
            padding: "10px 20px", background: "#ffffff", color: "#020617",
            fontWeight: 600, fontSize: "0.875rem", textDecoration: "none",
            flexShrink: 0,
          }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
