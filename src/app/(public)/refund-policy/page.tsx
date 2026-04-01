import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

const APP_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Read PublishRoad's Refund Policy — including our general no-refund rule for digital services, limited exception cases, billing error handling, and how to contact support.",
  alternates: { canonical: `${APP_URL}/refund-policy` },
  robots: { index: true, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-20">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
        >
          Refund Policy
        </h1>
        <p className="text-slate-400 mb-12 font-light">Last updated: April 2026</p>

        <div className="space-y-8">
          {[
            {
              title: "1. Policy Overview",
              body: "This Refund Policy explains how PublishRoad handles refund requests for subscriptions, one-time purchases, and done-for-you service orders. Because PublishRoad provides digital products, research outputs, AI-generated curation results, and time-based service work, most purchases are final once access or delivery has started. This policy should be read together with our Terms of Service.",
            },
            {
              title: "2. Nature of the Service",
              body: "PublishRoad delivers digital services that begin generating value immediately after purchase — including access to paid plans, curation credits, dashboards, downloadable results, and launch-support workflows. Once a curation credit is used, a report is generated, or delivery work has started, the service has already been consumed in whole or in part. For that reason, refunds are generally not available for change-of-mind purchases.",
            },
            {
              title: "3. General No-Refund Rule",
              body: "All sales are generally final. We do not ordinarily provide refunds, credits, or exchanges for unused curation credits, dissatisfaction with individual results, delays caused by third-party services, or failure to achieve a particular launch, PR, SEO, or business outcome. We strongly encourage users to try the Free plan first and review plan details carefully before upgrading.",
            },
            {
              title: "4. Limited Cases We May Review",
              body: "Although refunds are not standard, we may review requests on a case-by-case basis where: (a) you were charged more than once for the same purchase due to a billing error; (b) a payment succeeded but the purchased plan or service was never provisioned and our support team cannot correct it within a reasonable time; (c) an unauthorised charge is confirmed after investigation; or (d) a refund is required under applicable consumer law. Any exception remains at PublishRoad's sole discretion unless otherwise required by law.",
            },
            {
              title: "5. Non-Refundable Situations",
              body: "Refunds will normally not be granted for: (a) partially or fully used Starter, Pro, or Lifetime plan benefits; (b) unused subscription time after a cancellation request; (c) dissatisfaction with the websites, directories, investors, or communities surfaced in a curation; (d) failure of a third party to accept your submission, guest post, or outreach; (e) forgetting to cancel a recurring plan before the renewal date; or (f) suspension or termination caused by a violation of our Terms.",
            },
            {
              title: "6. Subscription Renewals",
              body: "For recurring plans such as Pro, cancelling your subscription stops future renewals only. It does not reverse the current billing cycle or create a prorated refund for the current month. You will usually retain access through the end of the already-paid billing period, after which renewal stops automatically.",
            },
            {
              title: "7. Done-For-You / Hire Us Services",
              body: "Orders for our done-for-you launch or submission services involve manual planning, operational allocation, and reserved team time. Once research, outreach preparation, submissions, or other fulfillment work has begun, those fees are non-refundable. If you believe you placed an order by mistake, contact us as quickly as possible. We may consider a cancellation before work begins, but approval is not guaranteed.",
            },
            {
              title: "8. How to Request a Refund Review",
              body: "If you believe your case qualifies for review, email contact@publishroad.com from the account email used for the purchase. Please include your full name, the transaction date, the payment provider used, the invoice or transaction ID, and a clear explanation of the issue. Providing screenshots or bank/payment evidence will help us investigate faster. We recommend contacting us within 7 days of the charge.",
            },
            {
              title: "9. Review & Processing Time",
              body: "We aim to acknowledge refund-related emails within 2 business days and resolve most reviews within 5 business days. If a refund is approved, the payment is sent back to the original payment method. Depending on your payment provider or bank, it may take an additional 5 to 10 business days for the funds to appear on your statement.",
            },
            {
              title: "10. Chargebacks & Payment Disputes",
              body: "Before initiating a chargeback, please contact us so we can investigate and try to resolve the issue directly. Filing an unjustified chargeback after receiving access or service delivery may result in account suspension while the dispute is reviewed. We reserve the right to provide relevant billing, access, and fulfilment records to the payment provider in response to any dispute.",
            },
            {
              title: "11. Changes to This Policy & Contact",
              body: "We may update this Refund Policy from time to time to reflect changes in our business, legal requirements, or payment operations. The latest version will always be posted on this page. If you have questions about billing, cancellations, or refunds, contact us at contact@publishroad.com and we will do our best to help promptly.",
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
