import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — PublishRoad",
  description: "Frequently asked questions about PublishRoad.",
};

const faqs = [
  {
    q: "What is PublishRoad?",
    a: "PublishRoad is an AI-powered SaaS that generates curated distribution plans for product launches. You enter your product details and we return a personalized list of the best directories, guest post opportunities, and press release sites for your product.",
  },
  {
    q: "What is a 'curation'?",
    a: "A curation is one request to generate a distribution plan. You provide your product URL, country, keywords, and description, and we return a categorized list of matching websites tailored to your product.",
  },
  {
    q: "How is the free plan different from paid plans?",
    a: "The free plan includes 1 curation with 5 results shown. Paid plans unlock full results (50+ sites) and more curations. The Starter plan gives 1 full curation for $9, Pro gives 10 curations/month for $39, and Lifetime gives unlimited curations for a one-time $599 fee.",
  },
  {
    q: "Can I re-run a curation?",
    a: "No — curations are one-time by design. Each submission is a unique analysis of your product at that point in time. If your product changes significantly, you can use another curation credit to get an updated plan.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No. Pro plan credits reset on your billing anniversary each month and do not roll over to the next month.",
  },
  {
    q: "What countries are supported?",
    a: "We support global distribution sites, plus country-specific sites for major markets. You can target any country, and we will include globally relevant sites in your results.",
  },
  {
    q: "Is there a refund policy?",
    a: "Due to the nature of digital content, we do not offer refunds on any plan or service. Please use the free plan to verify the quality of our results before purchasing.",
  },
  {
    q: "How do I cancel my Pro subscription?",
    a: "You can manage your subscription at any time from your dashboard Billing page. Cancellation takes effect at the end of the current billing period — you keep access until then.",
  },
  {
    q: "How is the AI matching done?",
    a: "We use advanced AI to analyze your product URL, keywords, and description, then match it against our curated database of verified websites. Each match is scored for relevance to your product category, target audience, and niche.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="bg-mesh relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative text-center px-4">
          <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
            FAQ
          </p>
          <h1
            className="text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
          >
            Frequently Asked Questions
          </h1>
          <p className="text-slate-500 text-lg font-light">
            Everything you need to know about PublishRoad.
          </p>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-16">
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6"
              style={{
                boxShadow: "0 2px 16px rgba(91,88,246,0.05)",
                border: "1px solid rgba(226,232,240,0.8)",
              }}
            >
              <h3
                className="font-semibold mb-3"
                style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
              >
                {faq.q}
              </h3>
              <p className="text-slate-500 leading-relaxed font-light">{faq.a}</p>
            </div>
          ))}
        </div>

        <div
          className="text-center mt-10 p-8 bg-white rounded-2xl"
          style={{
            boxShadow: "0 2px 16px rgba(91,88,246,0.05)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          <p className="text-slate-500 mb-5 font-light">
            Didn&apos;t find your answer?
          </p>
          <a
            href="/contact"
            className="inline-block text-white px-8 py-3 rounded-full font-medium btn-glow transition-all"
            style={{ backgroundColor: "var(--indigo)" }}
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
