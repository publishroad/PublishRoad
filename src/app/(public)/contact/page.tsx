import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/components/public/ContactForm";
import { buildTwitterMetadata, getSiteUrl, getSocialImages } from "@/lib/seo";

const APP_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Have a question, feedback, or need support? Contact the PublishRoad team — we respond within 1–2 business days.",
  alternates: { canonical: `${APP_URL}/contact` },
  openGraph: {
    title: "Contact Us",
    description: "Have a question or need support? Get in touch with the PublishRoad team.",
    url: `${APP_URL}/contact`,
    type: "website",
    siteName: "PublishRoad",
    images: getSocialImages("Contact PublishRoad"),
  },
  twitter: buildTwitterMetadata({
    title: "Contact Us",
    description: "Have a question or need support? Get in touch with the PublishRoad team.",
  }),
};

const contactFaqs = [
  {
    q: "How quickly do you reply?",
    a: "We usually reply within 1 business day, and often faster for active customer and billing questions.",
  },
  {
    q: "What should I include in my message?",
    a: "Share your product URL, the page or plan you are asking about, and any error details or screenshots if support is needed.",
  },
  {
    q: "Should I contact you before buying?",
    a: "Yes. If you are unsure which plan fits your launch, we can point you to the right option or recommend the Hire Us service.",
  },
] as const;

const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact PublishRoad",
  url: `${APP_URL}/contact`,
  description: "Contact the PublishRoad team for sales, support, partnership, and billing questions.",
  mainEntity: {
    "@type": "Organization",
    name: "PublishRoad",
    email: "contact@publishroad.com",
    url: APP_URL,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "contact@publishroad.com",
        availableLanguage: "English",
      },
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "contact@publishroad.com",
        availableLanguage: "English",
      },
      {
        "@type": "ContactPoint",
        contactType: "partnerships",
        email: "contact@publishroad.com",
        availableLanguage: "English",
      },
    ],
  },
};

const contactFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: contactFaqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactFaqSchema) }}
      />

      {/* Header */}
      <div className="bg-mesh relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative text-center px-4">
          <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
            Get in touch
          </p>
          <h1
            className="text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
          >
            Contact Us
          </h1>
          <p className="text-slate-500 font-light">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </div>
      </div>

      <ContactForm />

      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-[1.5rem] bg-white p-6" style={{ boxShadow: "0 4px 24px rgba(91,88,246,0.06)", border: "1px solid rgba(226,232,240,0.8)" }}>
            <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}>
              Common contact questions
            </h2>
            <div className="space-y-4">
              {contactFaqs.map((item) => (
                <div key={item.q}>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.q}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] p-6" style={{ background: "rgba(91,88,246,0.06)", border: "1px solid rgba(91,88,246,0.14)" }}>
            <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}>
              Why teams contact PublishRoad
            </h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>• Compare Starter, Pro, and Lifetime before purchase</li>
              <li>• Ask about the <Link href="/hire-us" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>done-for-you launch service</Link></li>
              <li>• Resolve billing, checkout, or account-access questions</li>
              <li>• Discuss partnerships, affiliates, and media opportunities</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
