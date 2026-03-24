"use client";

import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const paymentConfigFormSchema = z.object({
  provider: z.enum(["stripe", "razorpay", "paypal"]),
  publicKey: z.string().max(500).optional(),
  secretKey: z.string().max(1000).optional(),
  webhookSecret: z.string().max(1000).optional(),
  additionalConfigText: z.string().optional(),
});

type FormData = z.infer<typeof paymentConfigFormSchema>;

interface PaymentConfigFormProps {
  initialValues: {
    provider: "stripe" | "razorpay" | "paypal";
    publicKey: string;
    additionalConfig: Record<string, unknown>;
  } | null;
  hasExistingSecretKey: boolean;
  hasExistingWebhookSecret: boolean;
}

export function PaymentConfigForm({
  initialValues,
  hasExistingSecretKey,
  hasExistingWebhookSecret,
}: PaymentConfigFormProps) {
  const defaultAdditionalConfigText = useMemo(() => {
    if (!initialValues?.additionalConfig) return "{}";
    return JSON.stringify(initialValues.additionalConfig, null, 2);
  }, [initialValues]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(paymentConfigFormSchema) as Resolver<FormData>,
    defaultValues: {
      provider: initialValues?.provider ?? "stripe",
      publicKey: initialValues?.publicKey ?? "",
      secretKey: "",
      webhookSecret: "",
      additionalConfigText: defaultAdditionalConfigText,
    },
  });

  const selectedProvider = watch("provider");

  async function onSubmit(data: FormData) {
    let additionalConfig: Record<string, unknown> = {};

    if (data.additionalConfigText?.trim()) {
      try {
        const parsed = JSON.parse(data.additionalConfigText);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          toast.error("Additional Config must be a JSON object");
          return;
        }
        additionalConfig = parsed as Record<string, unknown>;
      } catch {
        toast.error("Additional Config is not valid JSON");
        return;
      }
    }

    const res = await fetch("/api/admin/payment-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: data.provider,
        publicKey: data.publicKey,
        secretKey: data.secretKey,
        webhookSecret: data.webhookSecret,
        additionalConfig,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save payment settings");
      return;
    }

    toast.success("Payment settings saved successfully");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy">Payment Gateway</h2>

        <div className="space-y-1.5">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            {...register("provider")}
            className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
          >
            <option value="stripe">Stripe</option>
            <option value="razorpay" disabled>Razorpay (Coming soon)</option>
            <option value="paypal">PayPal</option>
          </select>
          <p className="text-xs text-medium-gray">
            Use Stripe or PayPal as your active gateway.
          </p>
          {errors.provider && (
            <p className="text-xs text-error">{errors.provider.message}</p>
          )}
        </div>

        {selectedProvider === "paypal" && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-0.5">
            <p className="font-semibold">PayPal credentials</p>
            <p>Public Key / Client ID: PayPal REST app Client ID</p>
            <p>Secret Key: PayPal REST app Secret</p>
            <p>Webhook Secret: optional verification token/id you use for webhook validation</p>
            <p className="pt-1">Note: This config is enabled now. Live PayPal checkout/webhook processing still requires PayPal runtime integration.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="publicKey">Public Key / Client ID</Label>
          <Input
            id="publicKey"
            {...register("publicKey")}
            placeholder={selectedProvider === "paypal" ? "A...paypal-client-id" : "pk_live_..."}
          />
          {errors.publicKey && (
            <p className="text-xs text-error">{errors.publicKey.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="secretKey">
            Secret Key
            {hasExistingSecretKey && (
              <span className="text-xs font-normal text-medium-gray"> (leave blank to keep existing)</span>
            )}
          </Label>
          <Input
            id="secretKey"
            type="password"
            {...register("secretKey")}
            placeholder={hasExistingSecretKey ? "••••••••••••••••" : selectedProvider === "paypal" ? "PayPal app secret" : "sk_live_..."}
            autoComplete="off"
          />
          {errors.secretKey && (
            <p className="text-xs text-error">{errors.secretKey.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="webhookSecret">
            Webhook Secret
            {hasExistingWebhookSecret && (
              <span className="text-xs font-normal text-medium-gray"> (leave blank to keep existing)</span>
            )}
          </Label>
          <Input
            id="webhookSecret"
            type="password"
            {...register("webhookSecret")}
            placeholder={hasExistingWebhookSecret ? "••••••••••••••••" : selectedProvider === "paypal" ? "Webhook token/id" : "whsec_..."}
            autoComplete="off"
          />
          {errors.webhookSecret && (
            <p className="text-xs text-error">{errors.webhookSecret.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="additionalConfigText">Additional Config (JSON)</Label>
          <textarea
            id="additionalConfigText"
            {...register("additionalConfigText")}
            className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[120px] font-mono focus:outline-none focus:border-navy"
            placeholder='{"checkoutMode":"hosted"}'
          />
          <p className="text-xs text-medium-gray">
            Optional provider-specific settings stored as JSON.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-navy hover:bg-blue" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Payment Settings"}
        </Button>
      </div>
    </form>
  );
}
