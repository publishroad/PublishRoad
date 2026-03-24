import Link from "next/link";

interface UpsellBannerProps {
  maskedCount: number;
  planSlug: string;
}

export function UpsellBanner({ maskedCount, planSlug }: UpsellBannerProps) {
  if (planSlug !== "free" && planSlug !== "starter") return null;

  return (
    <div className="bg-gradient-to-r from-navy to-blue rounded-xl p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-base mb-1">
            {maskedCount} more sites are hidden
          </p>
          <p className="text-blue/90 text-sm">
            Upgrade to unlock all results including{" "}
            {planSlug === "free"
              ? `${maskedCount} additional sites`
              : "unlimited curations"}
            .
          </p>
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
          Unlock All
        </Link>
      </div>
    </div>
  );
}
