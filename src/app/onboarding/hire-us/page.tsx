"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ActivePaymentProvider } from "@/lib/payments/service";
import { PaymentMethodPicker } from "@/components/public/PaymentMethodPicker";

type PackageSlug = "starter" | "complete";

const packageCards: Array<{
  slug: PackageSlug;
  name: string;
  price: string;
  note: string;
  description: string;
}> = [
  {
    slug: "starter",
    name: "Starter",
    price: "$399",
    note: "One-time",
    description: "Managed launch submissions for quick traction.",
  },
  {
    slug: "complete",
    name: "Complete",
    price: "$999",
    note: "One-time",
    description: "Full done-for-you distribution, outreach, and support.",
  },
];

export default function HireUsOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("package");
  const preselectedPackage = selectedParam === "complete" ? "complete" : "starter";

  const [loading, setLoading] = useState<PackageSlug | null>(null);
  const [providerPicker, setProviderPicker] = useState<ActivePaymentProvider[] | null>(null);
  const [pendingPackage, setPendingPackage] = useState<PackageSlug | null>(null);

  const orderedCards = useMemo(() => {
    return [...packageCards].sort((a, b) => {
      if (a.slug === preselectedPackage) return -1;
      if (b.slug === preselectedPackage) return 1;
      return 0;
    });
  }, [preselectedPackage]);

  async function startHireUsCheckout(packageSlug: PackageSlug, provider?: ActivePaymentProvider) {
    if (loading && !provider) return;
    setLoading(packageSlug);

    try {
      const res = await fetch("/api/hire-us/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageSlug, provider }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start Hire Us checkout");
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
        await openRazorpayCheckout(data.razorpay).catch(() => setLoading(null));
        return;
      }

      toast.error("Unexpected checkout response. Please try again.");
      setLoading(null);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

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

      <div className="px-4 pb-20">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {orderedCards.map((pkg) => {
            const active = pkg.slug === preselectedPackage;
            const isLoading = loading === pkg.slug;

            return (
              <div
                key={pkg.slug}
                className="rounded-[2rem] p-8 bg-white"
                style={{
                  border: active ? "2px solid rgba(91,88,246,0.45)" : "1px solid rgba(226,232,240,0.9)",
                  boxShadow: active
                    ? "0 14px 48px rgba(91,88,246,0.18)"
                    : "0 6px 28px rgba(91,88,246,0.08)",
                }}
              >
                <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--indigo)" }}>
                  {pkg.name}
                </p>
                <p
                  className="mt-2 text-5xl font-bold"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
                >
                  {pkg.price}
                </p>
                <p className="text-sm text-slate-500 mt-1">{pkg.note}</p>
                <p className="text-sm text-slate-600 mt-5 leading-6">{pkg.description}</p>

                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => startHireUsCheckout(pkg.slug)}
                  className="mt-8 w-full rounded-full h-11 text-white font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #5B58F6 0%, #7C3AED 100%)",
                    opacity: loading && !isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? "Starting checkout..." : `Get Started ${pkg.price} →`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <button
            type="button"
            onClick={() => router.push("/hire-us")}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Back to Hire Us details
          </button>
        </div>
      </div>
    </>
  );
}
