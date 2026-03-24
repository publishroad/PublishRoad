"use client";

import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const emailConfigFormSchema = z.object({
  provider: z.enum(["resend", "smtp", "sendgrid", "ses"]),
  fromAddress: z.string().min(3).max(255),
  apiKey: z.string().max(2000).optional(),
  host: z.string().max(255).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(2000).optional(),
  useTls: z.boolean().default(true),
  additionalConfigText: z.string().optional(),
});

type FormData = z.infer<typeof emailConfigFormSchema>;

interface EmailConfigFormProps {
  initialValues: {
    provider: "resend" | "smtp" | "sendgrid" | "ses";
    fromAddress: string;
    host: string;
    port: number | null;
    username: string;
    useTls: boolean;
    additionalConfig: Record<string, unknown>;
  } | null;
  hasExistingApiKey: boolean;
  hasExistingPassword: boolean;
}

export function EmailConfigForm({
  initialValues,
  hasExistingApiKey,
  hasExistingPassword,
}: EmailConfigFormProps) {
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
    resolver: zodResolver(emailConfigFormSchema) as Resolver<FormData>,
    defaultValues: {
      provider: initialValues?.provider ?? "resend",
      fromAddress: initialValues?.fromAddress ?? "PublishRoad <noreply@publishroad.com>",
      apiKey: "",
      host: initialValues?.host ?? "",
      port: initialValues?.port ?? undefined,
      username: initialValues?.username ?? "",
      password: "",
      useTls: initialValues?.useTls ?? true,
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

    const res = await fetch("/api/admin/email-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: data.provider,
        fromAddress: data.fromAddress,
        apiKey: data.apiKey,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        useTls: data.useTls,
        additionalConfig,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save email settings");
      return;
    }

    toast.success("Email settings saved successfully");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy">Email Provider</h2>

        <div className="space-y-1.5">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            {...register("provider")}
            className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
          >
            <option value="resend">Resend</option>
            <option value="smtp">SMTP (e.g. SendPulse)</option>
            <option value="sendgrid" disabled>SendGrid (Coming soon)</option>
            <option value="ses" disabled>AWS SES (Coming soon)</option>
          </select>
          <p className="text-xs text-medium-gray">
            Use Resend (API key) or any SMTP provider like SendPulse.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fromAddress">From Address</Label>
          <Input id="fromAddress" {...register("fromAddress")} placeholder="PublishRoad <noreply@publishroad.com>" />
          {errors.fromAddress && <p className="text-xs text-error">{errors.fromAddress.message}</p>}
        </div>

        {selectedProvider === "resend" && (
          <div className="space-y-1.5">
            <Label htmlFor="apiKey">
              API Key
              {hasExistingApiKey && (
                <span className="text-xs font-normal text-medium-gray"> (leave blank to keep existing)</span>
              )}
            </Label>
            <Input
              id="apiKey"
              type="password"
              {...register("apiKey")}
              placeholder={hasExistingApiKey ? "••••••••••••••••" : "re_..."}
              autoComplete="off"
            />
          </div>
        )}

        {selectedProvider === "smtp" && (
          <>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-0.5">
              <p className="font-semibold">SendPulse SMTP settings</p>
              <p>Host: <code>smtp.sendpulse.com</code> &nbsp;|&nbsp; Port: <code>465</code> (SSL) or <code>587</code> (TLS)</p>
              <p>Find your credentials in SendPulse → Account settings → SMTP</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="host">SMTP Host</Label>
              <Input id="host" {...register("host")} placeholder="smtp.sendpulse.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="port">Port</Label>
                <Input id="port" type="number" {...register("port")} placeholder="587" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...register("username")} placeholder="your@email.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password
                {hasExistingPassword && (
                  <span className="text-xs font-normal text-medium-gray"> (leave blank to keep existing)</span>
                )}
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder={hasExistingPassword ? "••••••••••••••••" : "SMTP password"}
                autoComplete="off"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" {...register("useTls")} /> Use TLS / STARTTLS
            </label>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="additionalConfigText">Additional Config (JSON)</Label>
          <textarea
            id="additionalConfigText"
            {...register("additionalConfigText")}
            className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[120px] font-mono focus:outline-none focus:border-navy"
            placeholder='{"replyTo":"support@publishroad.com"}'
          />
          <p className="text-xs text-medium-gray">
            Optional provider-specific settings stored as JSON.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-navy hover:bg-blue" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Email Settings"}
        </Button>
      </div>
    </form>
  );
}
