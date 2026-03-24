import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — PublishRoad",
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
              body: "By accessing or using PublishRoad, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our service.",
            },
            {
              title: "2. Description of Service",
              body: "PublishRoad is an AI-powered platform that generates curated distribution plans for product launches. Each 'curation' is a one-time analysis that consumes one credit from your plan.",
            },
            {
              title: "3. Account Registration",
              body: "You must create an account to use PublishRoad. You are responsible for maintaining the security of your account and password. You must provide accurate and complete information during registration.",
            },
            {
              title: "4. Payments & Refunds",
              body: "All payments are processed securely through Stripe. Due to the digital nature of our service, all sales are final. We do not offer refunds on any plan or service. Please use the free plan to evaluate the service before purchasing.",
            },
            {
              title: "5. Credits & Plans",
              body: "Credits are consumed when you create a curation. Pro plan credits reset monthly on your billing anniversary and do not roll over. Free plan includes 1 curation. Credits have no cash value.",
            },
            {
              title: "6. Acceptable Use",
              body: "You may not use PublishRoad for any illegal purposes, to spam websites or services, to automate bulk submissions, or to harm any third party. We reserve the right to suspend accounts that violate these terms.",
            },
            {
              title: "7. Intellectual Property",
              body: "The curation results generated are provided for your personal and commercial use. The underlying algorithms, database, and platform are our intellectual property.",
            },
            {
              title: "8. Limitation of Liability",
              body: "PublishRoad is provided 'as is'. We make no guarantees about the accuracy or effectiveness of curation results. Our liability is limited to the amount you paid in the last 3 months.",
            },
            {
              title: "9. Changes to Terms",
              body: "We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.",
            },
            {
              title: "10. Contact",
              body: "For questions about these terms, contact us at legal@publishroad.com.",
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
