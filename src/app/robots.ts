import { MetadataRoute } from "next";
import { getCanonicalUrl, getSiteUrl } from "@/lib/seo";

const BASE_URL = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/blog", "/faq", "/contact", "/terms", "/privacy", "/refund-policy", "/cancellation-policy"],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/onboarding/",
          "/api/",
        ],
      },
    ],
    sitemap: getCanonicalUrl("/sitemap.xml"),
    host: BASE_URL,
  };
}
