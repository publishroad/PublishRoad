import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://publishroad.com";

export const metadata: Metadata = {
  title: "Privacy Policy | PublishRoad",
  description:
    "Read PublishRoad's Privacy Policy — how we collect, use, and protect your data, your GDPR rights, cookie policy, data retention, and how to contact us.",
  alternates: { canonical: `${APP_URL}/privacy` },
  robots: { index: true, follow: false },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-20">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
        >
          Privacy Policy
        </h1>
        <p className="text-slate-400 mb-12 font-light">Last updated: March 2026</p>

        <div className="space-y-8">
          {[
            {
              title: "1. Introduction",
              body: "PublishRoad (\"we\", \"us\", \"our\") is committed to protecting your personal data and respecting your privacy. This Privacy Policy explains what data we collect, why we collect it, how we use and protect it, and what rights you have over it. This policy applies to all users of our website and platform at publishroad.com. By using our Service, you agree to the collection and use of information in accordance with this policy.",
            },
            {
              title: "2. Information We Collect",
              body: "We collect: (a) Account data — name, email address, and hashed password when you register; (b) Product data — product URLs, keywords, descriptions, and target countries you submit when creating curations; (c) Payment data — billing country, plan purchased, and a payment provider reference ID (we never store full card numbers); (d) Usage data — pages visited, features used, curation history, credits consumed, and timestamps; (e) Technical data — IP address (for security and fraud prevention), browser type, device type, and referring URL; (f) Communications — any messages you send us via contact forms or email.",
            },
            {
              title: "3. How We Use Your Information",
              body: "We use your data to: (a) provide, operate, and maintain the Service; (b) process payments and manage your subscription; (c) send transactional emails (account verification, payment receipts, curation completion notifications); (d) personalise and improve the Service based on usage patterns; (e) detect, investigate, and prevent fraud, abuse, and security incidents; (f) comply with legal obligations and respond to lawful requests from authorities; (g) send product updates and promotional communications (you may opt out at any time). We do not use your product data to train AI models for third parties.",
            },
            {
              title: "4. Legal Basis for Processing (GDPR)",
              body: "For users in the European Economic Area (EEA) and UK, we process your data under the following legal bases: (a) Contract performance — to provide the Service you signed up for; (b) Legitimate interests — to detect fraud, improve the Service, and ensure security; (c) Consent — for non-essential analytics cookies and marketing communications; (d) Legal obligation — to comply with applicable laws. You may withdraw consent at any time without affecting the lawfulness of processing before withdrawal.",
            },
            {
              title: "5. Data Storage & Security",
              body: "Your data is stored on secure PostgreSQL databases hosted by Supabase, with servers located in the EU and/or US. We implement the following security measures: bcrypt password hashing (cost factor 12), AES-256 encryption for sensitive stored credentials, HTTPS/TLS encryption in transit, HTTP-only and Secure session cookies, rate limiting on all authentication endpoints, and regular security reviews. While we take all reasonable precautions, no method of transmission over the internet is 100% secure. If we become aware of a data breach affecting your personal data, we will notify you within 72 hours as required by applicable law.",
            },
            {
              title: "6. Payment Information",
              body: "We do not store your credit or debit card details. All payment processing is handled by PCI-DSS compliant payment providers (Stripe, PayPal, or Razorpay). We store only the payment provider's reference ID (e.g. Stripe Customer ID) and your plan/payment history, encrypted at rest. For disputes or refund queries related to payment processing, please refer to the respective provider's terms.",
            },
            {
              title: "7. Data Sharing & Third Parties",
              body: "We do not sell, rent, or trade your personal data. We share data only with the following trusted service providers who are bound by data processing agreements: Supabase (database hosting), Stripe / PayPal / Razorpay (payment processing), Resend (transactional email delivery), Sentry (error monitoring and crash reporting), PostHog (product analytics — see Section 8), Cloudflare R2 (file storage), and Upstash Redis (caching and session storage). We may also disclose data if required by law, court order, or to protect the rights, property, or safety of PublishRoad, our users, or others.",
            },
            {
              title: "8. Cookies & Analytics",
              body: "We use the following types of cookies: (a) Essential cookies — required for authentication and session management; cannot be disabled. (b) Analytics cookies — PostHog sets cookies to help us understand how users interact with the platform (pages visited, features used, session duration). These are non-essential. You may accept or reject non-essential cookies via the cookie consent banner displayed when you first visit the site. Your preference is stored in your browser's local storage. Rejecting analytics cookies will disable PostHog tracking. You can change your preference at any time by clearing your browser's local storage for publishroad.com.",
            },
            {
              title: "9. Your Rights",
              body: "Depending on your location, you may have the following rights regarding your personal data: (a) Right of access — request a copy of the data we hold about you; (b) Right to rectification — request correction of inaccurate or incomplete data; (c) Right to erasure — request deletion of your personal data (\"right to be forgotten\"); (d) Right to data portability — receive your data in a structured, machine-readable format; (e) Right to object — object to processing based on legitimate interests or direct marketing; (f) Right to restriction — request that we restrict processing of your data in certain circumstances; (g) Right to withdraw consent — withdraw consent for analytics and marketing at any time. To exercise any of these rights, contact us at contact@publishroad.com. We will respond within 30 days.",
            },
            {
              title: "10. Data Retention",
              body: "We retain your personal data for as long as your account is active or as needed to provide the Service. Upon account deletion: personal data (name, email) is removed within 30 days; curation data is anonymised rather than deleted (we retain aggregate usage statistics); payment records are retained for 7 years as required by financial regulations. Backups may retain data for up to 90 days after deletion. If you request data deletion, we will confirm completion within 30 days.",
            },
            {
              title: "11. Children's Privacy",
              body: "PublishRoad is not directed to children under the age of 16. We do not knowingly collect personal data from anyone under 16. If you believe a child under 16 has provided us with personal data, please contact us at contact@publishroad.com and we will delete the information promptly.",
            },
            {
              title: "12. International Data Transfers",
              body: "Your data may be transferred to and processed in countries outside your home country, including the United States. When we transfer personal data from the EEA or UK to third countries, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs) approved by the European Commission, or we rely on the recipient's certification under applicable data transfer frameworks.",
            },
            {
              title: "13. Changes to This Policy",
              body: "We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. If we make material changes, we will notify you by email or via a prominent notice on the platform at least 14 days before the changes take effect. The \"Last updated\" date at the top of this page always reflects the most recent version.",
            },
            {
              title: "14. Contact & Data Controller",
              body: "PublishRoad is the data controller for personal data processed under this policy. For any privacy-related questions, data subject requests, or concerns, please contact us at contact@publishroad.com. We aim to respond to all enquiries within 5 business days.",
            },
          ].map((section) => (
            <section
              key={section.title}
              className="bg-white rounded-2xl p-6"
              style={{ boxShadow: "0 2px 12px rgba(91,88,246,0.05)", border: "1px solid rgba(226,232,240,0.8)" }}
            >
              <h2
                className="text-lg font-semibold mb-3"
                style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
              >
                {section.title}
              </h2>
              <p className="text-slate-500 font-light leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
