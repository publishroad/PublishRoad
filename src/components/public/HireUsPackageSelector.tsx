"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActivePaymentProvider } from "@/lib/payments/service";
import { PaymentMethodPicker } from "@/components/public/PaymentMethodPicker";
import {
  DEFAULT_HIRE_US_PRICING_CONFIG,
  formatUsdFromCents,
  normalizeHireUsPricingConfig,
  type HireUsPricingConfig,
} from "@/lib/hire-us-config-shared";

export type HireUsPackageSlug = "starter" | "complete";

type HireUsSelectorVariant = "onboarding" | "dashboard";

interface HireUsSourceContext {
  source: string;
  curationId?: string;
  sectionKey?: "d" | "e" | "f";
  stepLabel?: "Step 4" | "Step 5" | "Step 6";
}

const dashboardFaqItemsTemplate = [
  ...DEFAULT_HIRE_US_PRICING_CONFIG.faq,
];

interface HireUsPackageSelectorProps {
  preselectedPackage?: HireUsPackageSlug;
  checkoutError?: string | null;
  loginCallbackBasePath?: string;
  variant?: HireUsSelectorVariant;
  showBackToDetails?: boolean;
  dashboardIntroTitle?: string;
  dashboardIntroSubtitle?: string;
  sourceContext?: HireUsSourceContext;
}

export function HireUsPackageSelector({
  preselectedPackage = "starter",
  checkoutError,
  loginCallbackBasePath = "/onboarding/hire-us",
  variant = "onboarding",
  showBackToDetails = false,
  dashboardIntroTitle = "No Hire Us requests yet.",
  dashboardIntroSubtitle = "Pick a package below to start instantly without leaving this page.",
  sourceContext,
}: HireUsPackageSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<HireUsPackageSlug | null>(null);
  const [pricingConfig, setPricingConfig] = useState<HireUsPricingConfig>(DEFAULT_HIRE_US_PRICING_CONFIG);
  const [providerPicker, setProviderPicker] = useState<ActivePaymentProvider[] | null>(null);
  const [pendingPackage, setPendingPackage] = useState<HireUsPackageSlug | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/hire-us/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!isMounted || !payload?.config) return;
        setPricingConfig(normalizeHireUsPricingConfig(payload.config));
      })
      .catch(() => {
        // Keep defaults on network failure
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!checkoutError) return;

    const message =
      checkoutError === "capture_failed"
        ? "Payment was not captured. Please try again."
        : checkoutError === "network_error"
        ? "Network error while confirming payment. Please try again."
        : "Payment could not be completed. Please try again.";

    setInlineError(message);
    toast.error(message);
  }, [checkoutError]);

  const orderedCards = useMemo(() => {
    const packageCards: Array<{
      slug: HireUsPackageSlug;
      name: string;
      price: string;
      note: string;
      description: string;
      includes: string[];
    }> = [
      {
        slug: "starter",
        name: "Starter",
        price: formatUsdFromCents(pricingConfig.starter.priceCents),
        note: "One-time",
        description: "Managed launch submissions for quick traction.",
        includes: pricingConfig.starter.includes,
      },
      {
        slug: "complete",
        name: "Complete",
        price: formatUsdFromCents(pricingConfig.complete.priceCents),
        note: "One-time",
        description: "Full done-for-you distribution, outreach, and support.",
        includes: pricingConfig.complete.includes,
      },
    ];

    return [...packageCards].sort((a, b) => {
      if (a.slug === preselectedPackage) return -1;
      if (b.slug === preselectedPackage) return 1;
      return 0;
    });
  }, [preselectedPackage, pricingConfig]);

  const dashboardFaqItems = useMemo(() => {
    return pricingConfig.faq.length > 0 ? pricingConfig.faq : dashboardFaqItemsTemplate;
  }, [pricingConfig]);

  async function startHireUsCheckout(packageSlug: HireUsPackageSlug, provider?: ActivePaymentProvider) {
    if (loading && !provider) return;
    setInlineError(null);
    setLoading(packageSlug);

    try {
      const res = await fetch("/api/hire-us/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageSlug, provider, sourceContext }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "Failed to start Hire Us checkout";
        setInlineError(message);
        toast.error(message);
        if (res.status === 401) {
          const callbackPath = `${loginCallbackBasePath}?package=${packageSlug}`;
          window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
        }
        setLoading(null);
        return;
      }

      if (data.selectProvider) {
        setPendingPackage(packageSlug);
        setProviderPicker(data.selectProvider as ActivePaymentProvider[]);
        setLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.razorpay) {
        const { openRazorpayCheckout } = await import("@/lib/razorpay-checkout");
        try {
          await openRazorpayCheckout(data.razorpay);
        } catch (error) {
          setLoading(null);
          if (error instanceof Error && error.message === "dismissed") {
            return;
          }
          const message =
            error instanceof Error && error.message
              ? `Razorpay checkout failed: ${error.message}`
              : "Razorpay checkout failed. Please try again.";
          setInlineError(message);
          toast.error(message);
        }
        return;
      }

      toast.error("Unexpected checkout response. Please try again.");
      setInlineError("Unexpected checkout response. Please try again.");
      setLoading(null);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setInlineError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  const isOnboarding = variant === "onboarding";

  return (
    <>
      {providerPicker && pendingPackage && (
        <PaymentMethodPicker
          providers={providerPicker}
          onSelect={(provider) => {
            setProviderPicker(null);
            startHireUsCheckout(pendingPackage, provider);
          }}
          onCancel={() => {
            setProviderPicker(null);
            setPendingPackage(null);
          }}
        />
      )}

      <div className={isOnboarding ? "px-4 pb-20" : "w-full"}>
        {isOnboarding ? (
          <div className="text-center mb-10 mt-4">
            <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
              Hire Us
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
            >
              Pick your managed package
            </h1>
            <p className="text-slate-500 font-light max-w-2xl mx-auto">
              After payment, we add 1 bonus curation credit automatically so you can complete onboarding and track execution in your Hire Us tab.
            </p>
          </div>
        ) : (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-2">{dashboardIntroTitle}</p>
            <p className="text-sm text-slate-600">{dashboardIntroSubtitle}</p>
          </div>
        )}

        <div className={isOnboarding ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
          {orderedCards.map((pkg) => {
            const active = pkg.slug === preselectedPackage;
            const isLoading = loading === pkg.slug;

            return (
              <div
                key={pkg.slug}
                className={isOnboarding ? "rounded-[2rem] p-8 bg-white flex h-full flex-col" : "rounded-2xl p-6 bg-white flex h-full flex-col"}
                style={{
                  border: active ? "2px solid rgba(91,88,246,0.45)" : "1px solid rgba(226,232,240,0.9)",
                  boxShadow: active ? "0 14px 48px rgba(91,88,246,0.18)" : "0 6px 28px rgba(91,88,246,0.08)",
                }}
              >
                <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--indigo)" }}>
                  {pkg.name}
                </p>
                <p
                  className={isOnboarding ? "mt-2 text-5xl font-bold" : "mt-2 text-4xl font-bold"}
                  style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
                >
                  {pkg.price}
                </p>
                <p className="text-sm text-slate-500 mt-1">{pkg.note}</p>
                <div className="flex-1">
                  <p className={isOnboarding ? "text-sm text-slate-600 mt-5 leading-6" : "text-sm text-slate-600 mt-4 leading-6"}>
                    {pkg.description}
                  </p>

                  {!isOnboarding && (
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Includes</p>
                      <div className="mt-3 space-y-2.5">
                        {pkg.includes.map((item) => (
                          <div key={item} className="flex items-start gap-3">
                            <span
                              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                              style={{ background: "rgba(91,88,246,0.1)", color: "#5B58F6" }}
                            >
                              ✓
                            </span>
                            <span className="text-sm leading-6 text-slate-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => startHireUsCheckout(pkg.slug)}
                  className={isOnboarding ? "mt-8 w-full rounded-full h-11 text-white font-semibold" : "mt-6 w-full rounded-xl h-11 text-white font-semibold"}
                  style={{
                    background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
                    opacity: loading && !isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? "Starting checkout..." : `Get Started ${pkg.price} ->`}
                </button>
              </div>
            );
          })}
        </div>

        {inlineError && (
          <p className={isOnboarding ? "mt-5 text-center text-sm text-rose-600" : "mt-4 text-center text-sm text-rose-600"} role="alert">
            {inlineError}
          </p>
        )}

        {!isOnboarding && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--indigo)" }}>
                  FAQ
                </p>
                <h2
                  className="mt-2 text-2xl font-bold text-slate-900"
                  style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
                >
                  Common questions before checkout
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                {dashboardFaqItems.map((item) => (
                  <details key={item.q} className="rounded-xl border border-slate-200 bg-white p-4 text-left">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                      {item.q}
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {showBackToDetails && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => router.push("/hire-us")}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Back to Hire Us details
            </button>
          </div>
        )}
      </div>
    </>
  );
}