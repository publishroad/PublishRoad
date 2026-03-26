import type { Metadata } from "next";
import { ContactForm } from "@/components/public/ContactForm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://publishroad.com";

export const metadata: Metadata = {
  title: "Contact Us | PublishRoad",
  description:
    "Have a question, feedback, or need support? Contact the PublishRoad team — we respond within 1–2 business days.",
  alternates: { canonical: `${APP_URL}/contact` },
  openGraph: {
    title: "Contact Us | PublishRoad",
    description: "Have a question or need support? Get in touch with the PublishRoad team.",
    url: `${APP_URL}/contact`,
  },
};

const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact PublishRoad",
  url: `${APP_URL}/contact`,
  description: "Contact the PublishRoad support team for questions, feedback, or billing help.",
  mainEntity: {
    "@type": "Organization",
    name: "PublishRoad",
    email: "contact@publishroad.com",
    url: APP_URL,
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
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
    </div>
  );
}
