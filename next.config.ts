import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "'self' https://js.stripe.com 'unsafe-inline' 'unsafe-eval'"
  : "'self' https://js.stripe.com 'unsafe-inline'";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src ${scriptSrc};
  frame-src https://js.stripe.com;
  img-src 'self' https://images.publishroad.com https://lh3.googleusercontent.com data: blob:;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com;
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
