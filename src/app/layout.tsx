import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { auth } from "@/lib/auth";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://publishroad.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  title: {
    default: "PublishRoad — AI-Powered Product Launch Distribution",
    template: "%s | PublishRoad",
  },
  description:
    "PublishRoad generates AI-powered distribution plans for product launches. Get curated lists of the best directories, guest post sites, press release platforms, social influencers, Reddit communities, and investors for your product.",
  keywords: [
    "product launch distribution", "product launch sites", "submit product to directories",
    "AI product launch", "distribution plan", "press release sites", "guest post sites",
    "startup launch checklist", "product hunt alternatives", "product distribution",
  ],
  authors: [{ name: "PublishRoad", url: APP_URL }],
  creator: "PublishRoad",
  publisher: "PublishRoad",
  applicationName: "PublishRoad",
  openGraph: {
    type: "website",
    siteName: "PublishRoad",
    locale: "en_US",
    url: APP_URL,
    title: "PublishRoad — AI-Powered Product Launch Distribution",
    description:
      "Generate a complete AI-powered distribution plan for your product launch. Curated directories, guest posts, press release sites, influencers, and investors — all matched to your product.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PublishRoad — AI-Powered Product Launch Distribution",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@publishroad",
    creator: "@publishroad",
    title: "PublishRoad — AI-Powered Product Launch Distribution",
    description:
      "Generate a complete AI-powered distribution plan for your product launch in minutes.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: APP_URL,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PublishRoad",
  url: APP_URL,
  logo: `${APP_URL}/favicon.png`,
  description:
    "PublishRoad is an AI-powered SaaS platform that generates curated distribution plans for product launches.",
  email: "contact@publishroad.com",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    email: "contact@publishroad.com",
    contactType: "customer support",
    availableLanguage: "English",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PublishRoad",
  url: APP_URL,
  description: "AI-powered distribution plans for product launches.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${APP_URL}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
