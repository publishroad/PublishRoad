import type { NextConfig } from "next";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET must be defined");
}

if (process.env.NODE_ENV === "production" && process.env.NEXTAUTH_SECRET.length < 32) {
  throw new Error("NEXTAUTH_SECRET must be at least 32 characters in production");
}

if (process.env.NODE_ENV === "production" && !process.env.EMAIL_QUEUE_SECRET) {
  throw new Error("EMAIL_QUEUE_SECRET must be defined in production");
}

if (process.env.NODE_ENV === "production" && !process.env.EMAIL_QUEUE_ALLOWED_IPS) {
  throw new Error("EMAIL_QUEUE_ALLOWED_IPS must be defined in production");
}

const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "'self' https://js.stripe.com https://checkout.razorpay.com https://*.razorpay.com https://*.razorpay.in https://*.rzp.io https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://va.vercel-scripts.com 'unsafe-inline' 'unsafe-eval'"
  : "'self' https://js.stripe.com https://checkout.razorpay.com https://*.razorpay.com https://*.razorpay.in https://*.rzp.io https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://va.vercel-scripts.com 'unsafe-inline'";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src ${scriptSrc};
  frame-src https://js.stripe.com https://checkout.razorpay.com https://*.razorpay.com https://*.razorpay.in https://*.rzp.io;
  img-src 'self' https://images.publishroad.com https://lh3.googleusercontent.com data: blob:;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  connect-src 'self' https://api.stripe.com https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://*.razorpay.in https://*.rzp.io https://vitals.vercel-insights.com https://us.i.posthog.com https://us-assets.i.posthog.com https://eu.i.posthog.com https://eu-assets.i.posthog.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.publishroad.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Increase body size limit for file upload routes via individual route config
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
