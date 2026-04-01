import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

const APP_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read PublishRoad's Terms of Service — covering account registration, plans, billing, no-refund policy, acceptable use, intellectual property, and liability.",
  alternates: { canonical: `${APP_URL}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-20">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
        >
          Terms of Service
        </h1>
        <p className="text-slate-400 mb-12 font-light">Last updated: March 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          {[
            {
              title: "1. Acceptance of Terms",
              body: "By accessing, registering for, or using PublishRoad (\"Service\"), you agree to be bound by these Terms of Service (\"Terms\") and our Privacy Policy. If you do not agree to these Terms in their entirety, you must not use our Service. These Terms constitute a legally binding agreement between you and PublishRoad. Your continued use of the Service following any changes to these Terms constitutes acceptance of those changes.",
            },
            {
              title: "2. Description of Service",
              body: "PublishRoad is an AI-powered SaaS platform that generates curated distribution plans for product launches. Users submit a product URL, target country, keywords, and description. Our AI analyses this input against our curated database and returns categorised lists of distribution sites, guest post opportunities, press release platforms, social influencers, Reddit communities, and investor/fund opportunities. Each analysis is called a \"curation\" and is a one-time, non-repeatable operation. PublishRoad does not guarantee placement, acceptance, or any specific outcome from using the curation results.",
            },
            {
              title: "3. Account Registration & Security",
              body: "You must create an account to access paid features. You agree to provide accurate, current, and complete information during registration and to keep it updated. You are solely responsible for maintaining the confidentiality of your password and for all activities that occur under your account. You must notify us immediately at contact@publishroad.com of any unauthorised use of your account. We reserve the right to suspend or terminate accounts where we suspect fraudulent, abusive, or illegal activity. You must be at least 16 years of age to create an account.",
            },
            {
              title: "4. Plans, Credits & Billing",
              body: "PublishRoad offers the following plans: Free ($0, 1 curation, first 5 results shown), Starter ($9 one-time, 1 full curation), Pro ($39/month, 10 curations per billing cycle), and Lifetime ($599 one-time, unlimited curations). Credits represent the right to run one curation. Pro plan credits reset on your monthly billing anniversary and do not roll over. Lifetime plan credits are unlimited and never expire. Credits have no cash value and cannot be transferred. All prices are displayed in USD. We reserve the right to change pricing with 30 days' notice to existing subscribers.",
            },
            {
              title: "5. Payments & No-Refund Policy",
              body: "All payments are processed securely via our payment providers (Stripe, PayPal, or Razorpay). By purchasing a plan, you authorise us to charge your selected payment method. All sales are final. We do not offer refunds, credits, or exchanges for any reason, including but not limited to unused credits, dissatisfaction with curation results, or account suspension due to Terms violations. We strongly recommend using the Free plan to evaluate the Service before purchasing. In cases of billing errors caused solely by us, we will issue a correction at our discretion.",
            },
            {
              title: "6. Acceptable Use Policy",
              body: "You agree not to use PublishRoad to: (a) violate any applicable law or regulation; (b) infringe any third-party intellectual property, privacy, or proprietary rights; (c) submit false, misleading, or harmful product information; (d) automate bulk submissions to any website using our curation results; (e) resell, sublicense, or redistribute curation results as a competing service; (f) attempt to reverse-engineer, scrape, or extract our database or algorithms; (g) use the Service to promote illegal products, malware, spam, or adult content; (h) harass, abuse, or harm any person or entity. Violations may result in immediate account suspension without refund.",
            },
            {
              title: "7. Intellectual Property",
              body: "All curation results generated for your account are licensed to you for personal and commercial use. The PublishRoad platform, including its AI algorithms, website database, source code, branding, and all proprietary content, is and remains the exclusive intellectual property of PublishRoad. You may not copy, replicate, or use our platform or database to build a competing product. User-submitted content (product descriptions, URLs, keywords) remains your property. By submitting content, you grant us a limited, non-exclusive licence to process it solely for the purpose of generating your curation.",
            },
            {
              title: "8. AI-Generated Results & Disclaimer",
              body: "Curation results are generated using AI and are provided for informational purposes only. We make no warranties, express or implied, regarding the accuracy, completeness, suitability, or effectiveness of any curation result. Results reflect publicly available data at the time of curation and may become outdated. PublishRoad does not endorse any website, platform, influencer, subreddit, or investor listed in curation results. You are solely responsible for independently verifying any website or entity before engaging with them.",
            },
            {
              title: "9. Limitation of Liability",
              body: "To the maximum extent permitted by applicable law, PublishRoad, its directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of revenue, loss of data, or loss of business opportunity, arising out of or in connection with your use of the Service. Our total aggregate liability to you for any claim arising under these Terms shall not exceed the total amount you paid to PublishRoad in the 3 months immediately preceding the claim. Some jurisdictions do not allow exclusion of implied warranties or limitation of liability — in such cases, our liability is limited to the fullest extent permitted by law.",
            },
            {
              title: "10. Termination",
              body: "You may close your account at any time by contacting us at contact@publishroad.com. Upon termination, your access to the Service ceases immediately. Unused credits are forfeited upon voluntary termination. We reserve the right to suspend or terminate your account at any time, with or without notice, for breach of these Terms. Provisions relating to intellectual property, limitation of liability, and dispute resolution survive termination.",
            },
            {
              title: "11. Governing Law & Dispute Resolution",
              body: "These Terms are governed by and construed in accordance with applicable law. Any disputes arising under these Terms shall first be attempted to be resolved informally by contacting us at contact@publishroad.com. If a dispute cannot be resolved informally within 30 days, it shall be submitted to binding arbitration. Nothing in this clause prevents either party from seeking injunctive or other equitable relief in a court of competent jurisdiction.",
            },
            {
              title: "12. Changes to Terms",
              body: "We may update these Terms at any time. If we make material changes, we will notify registered users via email or a prominent notice on the platform at least 14 days before the changes take effect. Your continued use of the Service after that period constitutes your acceptance of the updated Terms. If you do not agree to the updated Terms, you must stop using the Service.",
            },
            {
              title: "13. Contact",
              body: "For any questions, concerns, or legal notices related to these Terms of Service, please contact us at contact@publishroad.com. We aim to respond to all enquiries within 2 business days.",
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
