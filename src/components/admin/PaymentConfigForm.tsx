"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const credentialsSchema = z.object({
  publicKey: z.string().max(500).optional(),
  secretKey: z.string().max(1000).optional(),
  webhookSecret: z.string().max(1000).optional(),
  additionalConfigText: z.string().optional(),
});
type CredentialsForm = z.infer<typeof credentialsSchema>;

export interface ProviderConfig {
  provider: "stripe" | "paypal" | "razorpay";
  isActive: boolean;
  publicKey: string;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  additionalConfig: Record<string, unknown>;
}

interface PaymentConfigFormProps {
  initialConfigs: ProviderConfig[];
}

const PROVIDER_META = {
  stripe: {
    label: "Stripe",
    publicKeyLabel: "Publishable Key",
    publicKeyPlaceholder: "pk_live_...",
    secretKeyPlaceholder: "sk_live_...",
    webhookPlaceholder: "whsec_...",
    hint: "Public Key = Stripe publishable key (pk_live_...). Secret Key = Stripe secret key (sk_live_...).",
  },
  paypal: {
    label: "PayPal",
    publicKeyLabel: "Client ID",
    publicKeyPlaceholder: "A...paypal-client-id",
    secretKeyPlaceholder: "PayPal app secret",
    webhookPlaceholder: "Webhook verification token/id (optional)",
    hint: "Public Key = PayPal REST app Client ID. Secret Key = PayPal REST app Secret. Add {\"mode\":\"sandbox\"} in Additional Config for testing.",
  },
  razorpay: {
    label: "Razorpay",
    publicKeyLabel: "Key ID",
    publicKeyPlaceholder: "rzp_live_...",
    secretKeyPlaceholder: "Razorpay key secret",
    webhookPlaceholder: "Webhook secret",
    hint: "Public Key = Razorpay Key ID. Secret Key = Razorpay Key Secret.",
  },
};

function ProviderCard({
  config,
  onActivate,
  onDeactivate,
  onSave,
}: {
  config: ProviderConfig;
  onActivate: (provider: string) => Promise<void>;
  onDeactivate: () => Promise<void>;
  onSave: (provider: string, data: CredentialsForm) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const meta = PROVIDER_META[config.provider];
  const isConfigured = config.hasSecretKey;

  async function handleTestConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/payment-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: config.provider }),
      });
      const data = await res.json() as { success: boolean; message?: string; error?: string; debug?: Record<string, unknown> };
      if (data.success) {
        toast.success(data.message ?? "Connection successful");
      } else {
        const debugStr = data.debug ? `\n${JSON.stringify(data.debug)}` : "";
        toast.error((data.error ?? "Test failed") + debugStr, { duration: 8000 });
      }
    } catch {
      toast.error("Network error — could not reach test endpoint");
    } finally {
      setTesting(false);
    }
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema) as Resolver<CredentialsForm>,
    defaultValues: {
      publicKey: config.publicKey,
      secretKey: "",
      webhookSecret: "",
      additionalConfigText: Object.keys(config.additionalConfig).length > 0
        ? JSON.stringify(config.additionalConfig, null, 2)
        : "{}",
    },
  });

  async function handleSave(data: CredentialsForm) {
    await onSave(config.provider, data);
    setExpanded(false);
  }

  return (
    <div className={`rounded-xl border ${config.isActive ? "border-navy bg-blue-50/40" : "border-border-gray bg-white"} p-5 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-dark-gray">{meta.label}</span>
          {config.isActive && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-navy text-white">Active</span>
          )}
          {isConfigured && !config.isActive && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Configured</span>
          )}
          {!isConfigured && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not configured</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {config.isActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 text-error border-error hover:bg-red-50"
              onClick={onDeactivate}
            >
              Deactivate
            </Button>
          )}
          {isConfigured && !config.isActive && (
            <Button
              type="button"
              size="sm"
              className="text-xs h-7 bg-navy hover:bg-blue text-white"
              onClick={() => onActivate(config.provider)}
            >
              Set as Active
            </Button>
          )}
          {isConfigured && config.provider === "paypal" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide" : isConfigured ? "Edit Credentials" : "Add Credentials"}
          </Button>
        </div>
      </div>

      {/* Expanded credentials form */}
      {expanded && (
        <form onSubmit={handleSubmit(handleSave)} className="space-y-3 pt-2 border-t border-border-gray">
          <p className="text-xs text-medium-gray">{meta.hint}</p>

          <div className="space-y-1.5">
            <Label htmlFor={`${config.provider}-publicKey`}>{meta.publicKeyLabel}</Label>
            <Input
              id={`${config.provider}-publicKey`}
              {...register("publicKey")}
              placeholder={meta.publicKeyPlaceholder}
            />
            {errors.publicKey && <p className="text-xs text-error">{errors.publicKey.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${config.provider}-secretKey`}>
              Secret Key
              {config.hasSecretKey && (
                <span className="text-xs font-normal text-medium-gray"> (leave blank to keep existing)</span>
              )}
            </Label>
            <Input
              id={`${config.provider}-secretKey`}
              type="password"
              {...register("secretKey")}
              placeholder={config.hasSecretKey ? "••••••••••••••••" : meta.secretKeyPlaceholder}
              autoComplete="off"
            />
            {errors.secretKey && <p className="text-xs text-error">{errors.secretKey.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${config.provider}-webhookSecret`}>
              Webhook Secret
              {config.hasWebhookSecret && (
                <span className="text-xs font-normal text-medium-gray"> (leave blank to keep existing)</span>
              )}
            </Label>
            <Input
              id={`${config.provider}-webhookSecret`}
              type="password"
              {...register("webhookSecret")}
              placeholder={config.hasWebhookSecret ? "••••••••••••••••" : meta.webhookPlaceholder}
              autoComplete="off"
            />
            {errors.webhookSecret && <p className="text-xs text-error">{errors.webhookSecret.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${config.provider}-additionalConfig`}>Additional Config (JSON)</Label>
            <textarea
              id={`${config.provider}-additionalConfig`}
              {...register("additionalConfigText")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[80px] font-mono focus:outline-none focus:border-navy"
              placeholder='{"mode":"sandbox"}'
            />
            <p className="text-xs text-medium-gray">Optional provider-specific settings (e.g. <code className="bg-gray-100 px-1 rounded">{`{"mode":"sandbox"}`}</code> for PayPal testing).</p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" className="bg-navy hover:bg-blue" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Credentials"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const ALL_PROVIDERS: ProviderConfig["provider"][] = ["stripe", "paypal", "razorpay"];

function buildDefaultConfig(provider: ProviderConfig["provider"]): ProviderConfig {
  return { provider, isActive: false, publicKey: "", hasSecretKey: false, hasWebhookSecret: false, additionalConfig: {} };
}

export function PaymentConfigForm({ initialConfigs }: PaymentConfigFormProps) {
  const [configs, setConfigs] = useState<ProviderConfig[]>(() => {
    // Ensure all 3 providers are always shown, even if not yet configured
    return ALL_PROVIDERS.map(
      (p) => initialConfigs.find((c) => c.provider === p) ?? buildDefaultConfig(p)
    );
  });

  const activeProvider = configs.find((c) => c.isActive);

  async function handleActivate(provider: string) {
    const res = await fetch("/api/admin/payment-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (!res.ok) {
      toast.error("Failed to activate provider");
      return;
    }
    setConfigs((prev) => prev.map((c) => ({ ...c, isActive: c.provider === provider })));
    toast.success(`${PROVIDER_META[provider as ProviderConfig["provider"]].label} is now the active payment gateway`);
  }

  async function handleDeactivate() {
    const res = await fetch("/api/admin/payment-config", { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to deactivate");
      return;
    }
    setConfigs((prev) => prev.map((c) => ({ ...c, isActive: false })));
    toast.success("Payment gateway deactivated — payments are now disabled");
  }

  async function handleSave(provider: string, data: CredentialsForm) {
    let additionalConfig: Record<string, unknown> = {};
    if (data.additionalConfigText?.trim() && data.additionalConfigText.trim() !== "{}") {
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
        provider,
        publicKey: data.publicKey,
        secretKey: data.secretKey,
        webhookSecret: data.webhookSecret,
        additionalConfig,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save credentials");
      return;
    }

    setConfigs((prev) =>
      prev.map((c) =>
        c.provider === provider
          ? {
              ...c,
              publicKey: data.publicKey ?? c.publicKey,
              hasSecretKey: !!(data.secretKey?.trim()) || c.hasSecretKey,
              hasWebhookSecret: !!(data.webhookSecret?.trim()) || c.hasWebhookSecret,
              additionalConfig,
            }
          : c
      )
    );

    toast.success(`${PROVIDER_META[provider as ProviderConfig["provider"]].label} credentials saved`);
  }

  return (
    <div className="space-y-4">
      {/* Active gateway banner */}
      <div className={`rounded-lg px-4 py-3 text-sm ${activeProvider ? "bg-navy/5 border border-navy/20 text-navy" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
        {activeProvider
          ? <>Active gateway: <span className="font-semibold">{PROVIDER_META[activeProvider.provider].label}</span> — payments are enabled.</>
          : <>No payment gateway is active. Configure and activate one below to enable payments.</>
        }
      </div>

      {/* Provider cards */}
      {configs.map((config) => (
        <ProviderCard
          key={config.provider}
          config={config}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}
