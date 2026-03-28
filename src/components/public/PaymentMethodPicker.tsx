"use client";

import type { ActivePaymentProvider } from "@/lib/payments/service";

const PROVIDER_LABELS: Record<ActivePaymentProvider, string> = {
  stripe: "Pay with Card (Stripe)",
  paypal: "Pay with PayPal",
  razorpay: "Pay with Razorpay",
};

const PROVIDER_ICONS: Record<ActivePaymentProvider, string> = {
  stripe: "💳",
  paypal: "🅿️",
  razorpay: "₹",
};

interface PaymentMethodPickerProps {
  providers: ActivePaymentProvider[];
  onSelect: (provider: ActivePaymentProvider) => void;
  onCancel: () => void;
}

export function PaymentMethodPicker({ providers, onSelect, onCancel }: PaymentMethodPickerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(2,6,23,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-[2rem] p-8 w-full max-w-sm"
        style={{ boxShadow: "0 20px 60px rgba(91,88,246,0.15)" }}
      >
        <h2
          className="text-xl font-bold mb-1 text-center"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
        >
          Choose payment method
        </h2>
        <p className="text-sm text-slate-400 text-center mb-6 font-light">
          Select how you&apos;d like to pay
        </p>

        <div className="space-y-3">
          {providers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 px-5 py-4 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/40 focus:outline-none"
            >
              <span className="text-2xl leading-none">{PROVIDER_ICONS[p]}</span>
              <span className="font-medium text-sm" style={{ color: "var(--dark)" }}>
                {PROVIDER_LABELS[p]}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-5 w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
