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

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  title: {
    default: "PublishRoad — Launch Your Product to the Right Places",
    template: "%s | PublishRoad",
  },
  description:
    "AI-powered distribution plans for product launches. Get curated lists of the best sites to submit your product, get backlinks, and get press coverage.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    siteName: "PublishRoad",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch session server-side to avoid client-side API call
  // Passed to SessionProvider so useSession() doesn't trigger /api/auth/session request
  const session = await auth();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
