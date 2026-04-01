import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

const APP_URL = getSiteUrl();

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "Read PublishRoad's Cancellation Policy — how to cancel recurring plans, what happens to access and credits, and how cancellation differs from refunds or account deletion.",
  alternates: { canonical: `${APP_URL}/cancellation-policy` },
  robots: { index: true, follow: true },
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-20">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
        >
          Cancellation Policy
        </h1>
        <p className="text-slate-400 mb-12 font-light">Last updated: April 2026</p>

        <div className="space-y-8">
          {[
            {
              title: "1. Purpose of This Policy",
              body: "This Cancellation Policy explains how PublishRoad users can stop recurring subscriptions, what happens to their access after cancellation, and how cancellation requests are handled for one-time purchases and done-for-you services. Cancellation is different from a refund: cancelling prevents future billing, while refund requests are governed by our Refund Policy and Terms of Service.",
            },
            {
              title: "2. Cancelling a Recurring Subscription",
              body: "If you are on a recurring Pro subscription, you may cancel at any time from your billing settings inside the dashboard or by contacting contact@publishroad.com from your registered account email. To avoid the next renewal charge, your cancellation request should be submitted before the upcoming billing date. Once confirmed, automatic renewal will be turned off for future cycles.",
            },
            {
              title: "3. When Cancellation Takes Effect",
              body: "Unless otherwise stated in writing, subscription cancellations take effect at the end of the current paid billing period. This means you generally keep access to your plan features until that billing period expires, and then your account reverts to the applicable free or lower-access state. Cancellation does not usually remove access immediately unless you specifically request account closure.",
            },
            {
              title: "4. No Prorated Refunds on Cancellation",
              body: "Cancelling a recurring plan does not create a full or partial refund for the current billing cycle. Because access and features are made available immediately upon renewal, the current cycle remains chargeable even if you cancel before the end date. If you believe you were billed in error, contact us and we will review the case under our Refund Policy.",
            },
            {
              title: "5. What Happens to Credits and Features",
              body: "After a subscription cancellation becomes effective, any subscription-based benefits tied to that plan may expire or reduce according to the plan rules. For example, Pro plan credits are tied to the active billing cycle and do not roll over indefinitely after cancellation. Lifetime plan access is not affected by cancelling a recurring plan because it is a separate one-time purchase.",
            },
            {
              title: "6. One-Time Purchases",
              body: "Starter and Lifetime plans are one-time purchases rather than recurring subscriptions. Because there is no ongoing renewal to stop, these purchases are not considered cancellable once payment has been completed and access has been granted. If you experience a billing issue or an accidental duplicate charge, please contact us for review.",
            },
            {
              title: "7. Hire Us / Done-For-You Service Orders",
              body: "Our done-for-you services reserve operational time and may involve project planning soon after purchase. If you need to request a cancellation for a service order, contact us immediately. If no fulfilment work has started, we may review the request at our discretion. Once execution, research, outreach preparation, or submission work has begun, cancellation may no longer be possible and fees already committed remain non-refundable.",
            },
            {
              title: "8. Account Deletion vs. Subscription Cancellation",
              body: "Deleting your account and cancelling a subscription are not the same action. If you only want to stop future renewals, cancel the subscription first. If you also want your account closed, mention that clearly in your email. Account deletion may result in loss of access to historical dashboards, curation results, and billing context, subject to our legal retention obligations.",
            },
            {
              title: "9. Failed Payments and Automatic Expiry",
              body: "If a renewal payment fails and cannot be successfully retried, your paid subscription may lapse automatically at the end of the grace or retry period. In that case, your access may downgrade without a formal cancellation request. You are responsible for keeping your payment method current if you want uninterrupted service.",
            },
            {
              title: "10. Contact & Policy Updates",
              body: "We may update this Cancellation Policy when our products, billing systems, or legal requirements change. The latest version will always appear on this page. If you need help stopping a renewal or understanding how cancellation affects your account, please contact contact@publishroad.com and we will assist you as quickly as possible.",
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
