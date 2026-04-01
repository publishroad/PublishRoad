"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ActivePaymentProvider } from "@/lib/payments/service";

type ProviderMeta = {
  label: string;
  description: string;
  accent: string;
  borderColor: string;
  logo: ReactNode;
  logoStyle: CSSProperties;
};

const PROVIDER_META: Record<ActivePaymentProvider, ProviderMeta> = {
  stripe: {
    label: "Stripe",
    description: "Fast card checkout for global customers",
    accent: "#635BFF",
    borderColor: "rgba(99,91,255,0.22)",
    logoStyle: {
      color: "#635BFF",
      fontWeight: 800,
      letterSpacing: "-0.04em",
      fontSize: "0.92rem",
    },
    logo: <>stripe</>,
  },
  paypal: {
    label: "PayPal",
    description: "Pay from your balance or linked cards",
    accent: "#0070ba",
    borderColor: "rgba(0,112,186,0.22)",
    logoStyle: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
      fontSize: "0.9rem",
    },
    logo: (
      <>
        <span style={{ color: "#003087" }}>Pay</span>
        <span style={{ color: "#009cde" }}>Pal</span>
      </>
    ),
  },
  razorpay: {
    label: "Razorpay",
    description: "Cards, UPI, netbanking, and local methods",
    accent: "#2b6df6",
    borderColor: "rgba(43,109,246,0.22)",
    logoStyle: {
      color: "#2b6df6",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      fontSize: "0.88rem",
    },
    logo: <>Razorpay</>,
  },
};

interface PaymentMethodPickerProps {
  providers: ActivePaymentProvider[];
  onSelect: (provider: ActivePaymentProvider) => void;
  onCancel: () => void;
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function PaymentMethodPicker({ providers, onSelect, onCancel }: PaymentMethodPickerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(2,6,23,0.58)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Choose payment gateway"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[2rem] p-5 sm:p-6 w-full max-w-md border border-slate-200"
        style={{ boxShadow: "0 24px 80px rgba(15,23,42,0.18)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(91,88,246,0.10)", color: "#5B58F6" }}
          >
            <LockIcon />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-1.5">
              Secure checkout
            </p>
            <h2
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
            >
              Choose your payment gateway
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-light leading-6">
              Select your preferred payment method to continue.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close payment method picker"
            className="h-9 w-9 shrink-0 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {providers.map((provider) => {
            const meta = PROVIDER_META[provider];

            return (
              <button
                key={provider}
                type="button"
                onClick={() => onSelect(provider)}
                className="group w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-left transition-all hover:bg-slate-50 focus:outline-none"
                style={{ borderColor: meta.borderColor }}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    className="inline-flex h-11 min-w-[92px] shrink-0 items-center justify-center rounded-xl border bg-white px-3 shadow-sm"
                    style={{ borderColor: meta.borderColor }}
                  >
                    <span style={meta.logoStyle}>{meta.logo}</span>
                  </span>

                  <span className="min-w-0">
                    <span className="block font-semibold text-sm" style={{ color: "var(--dark)" }}>
                      {meta.label}
                    </span>
                    <span className="block text-xs text-slate-500 mt-1">
                      {meta.description}
                    </span>
                  </span>
                </span>

                <span
                  className="text-base transition-transform group-hover:translate-x-0.5"
                  style={{ color: meta.accent }}
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-[11px] text-slate-500 text-center font-light leading-5 flex items-center justify-center gap-1.5">
            <span style={{ color: "#5B58F6" }}><LockIcon /></span>
            If only one gateway is active, checkout skips this step automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
