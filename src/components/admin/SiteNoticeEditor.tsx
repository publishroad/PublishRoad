"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizeSiteNoticeConfig,
  type SiteNoticeConfig,
} from "@/lib/site-notice-config-shared";

export function SiteNoticeEditor({ initialConfig }: { initialConfig: SiteNoticeConfig }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [message, setMessage] = useState(initialConfig.message);
  const [ctaLabel, setCtaLabel] = useState(initialConfig.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(initialConfig.ctaUrl);
  const [isSaving, setIsSaving] = useState(false);

  async function saveConfig() {
    const config = normalizeSiteNoticeConfig({
      enabled,
      message,
      ctaLabel,
      ctaUrl,
    });

    if (config.enabled && (!config.message || !config.ctaLabel || !config.ctaUrl)) {
      toast.error("Message, CTA label, and CTA URL are required when notice is enabled");
      return;
    }

    setIsSaving(true);
    const res = await fetch("/api/admin/site-notice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    setIsSaving(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error ?? "Failed to save notice settings");
      return;
    }

    toast.success("Notice bar settings updated");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-border-gray bg-white p-6">
      <div className="mb-4">
        <p className="font-semibold text-navy">Public Important Notice Bar</p>
        <p className="mt-1 text-sm text-medium-gray">
          Shows a dismissible bar above the public header with message and CTA.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4"
          />
          Enable public notice bar
        </label>

        <div className="space-y-1.5">
          <Label>Message</Label>
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={220}
            placeholder="For limited time free package available"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>CTA Label</Label>
            <Input
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              maxLength={60}
              placeholder="Click here"
            />
          </div>
          <div className="space-y-1.5">
            <Label>CTA URL</Label>
            <Input
              value={ctaUrl}
              onChange={(event) => setCtaUrl(event.target.value)}
              maxLength={500}
              placeholder="/pricing"
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Button className="bg-navy hover:bg-blue" onClick={saveConfig} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Notice Bar"}
        </Button>
      </div>
    </div>
  );
}
