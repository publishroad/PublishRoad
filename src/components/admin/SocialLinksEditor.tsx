"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SOCIAL_PLATFORM_OPTIONS,
  getSocialPlatformLabel,
  type SocialLinkConfig,
  type SocialPlatformKey,
} from "@/lib/social-links-config-shared";

function createDefaultLink(index: number): SocialLinkConfig {
  return {
    id: `social-${Date.now()}-${index}`,
    platform: "x",
    label: getSocialPlatformLabel("x"),
    href: "https://",
    enabled: true,
    order: index,
  };
}

export function SocialLinksEditor({ initialLinks }: { initialLinks: SocialLinkConfig[] }) {
  const router = useRouter();
  const [links, setLinks] = useState<SocialLinkConfig[]>(initialLinks);
  const [isSaving, setIsSaving] = useState(false);

  function syncOrder(items: SocialLinkConfig[]): SocialLinkConfig[] {
    return items.map((item, index) => ({ ...item, order: index }));
  }

  function updateLink(index: number, patch: Partial<SocialLinkConfig>) {
    setLinks((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  function addLink() {
    setLinks((current) => syncOrder([...current, createDefaultLink(current.length)]));
  }

  function removeLink(index: number) {
    setLinks((current) => syncOrder(current.filter((_, itemIndex) => itemIndex !== index)));
  }

  function moveLink(index: number, direction: -1 | 1) {
    setLinks((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const cloned = [...current];
      const [moved] = cloned.splice(index, 1);
      cloned.splice(nextIndex, 0, moved);
      return syncOrder(cloned);
    });
  }

  async function saveLinks() {
    setIsSaving(true);

    const payload = {
      links: syncOrder(links).map((item) => ({
        id: item.id,
        platform: item.platform,
        label: item.label.trim(),
        href: item.href.trim(),
        enabled: item.enabled,
        order: item.order,
      })),
    };

    const res = await fetch("/api/admin/social-links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSaving(false);

    if (!res.ok) {
      const response = await res.json().catch(() => ({}));
      toast.error(response.error ?? "Failed to save social links");
      return;
    }

    const response = (await res.json()) as { links?: SocialLinkConfig[] };
    if (response.links) {
      setLinks(syncOrder(response.links));
    }

    toast.success("Social links updated");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-xl border border-border-gray bg-white p-6">
      <div className="mb-4">
        <p className="font-semibold text-navy">Social Media Links</p>
        <p className="mt-1 text-sm text-medium-gray">
          Edit footer/public social links, enable or disable links, and add new accounts using predefined platforms.
        </p>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={link.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={link.enabled}
                  onChange={(event) => updateLink(index, { enabled: event.target.checked })}
                  className="h-4 w-4"
                />
                Enabled
              </label>

              <select
                value={link.platform}
                onChange={(event) => {
                  const platform = event.target.value as SocialPlatformKey;
                  updateLink(index, {
                    platform,
                    label: getSocialPlatformLabel(platform),
                  });
                }}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {SOCIAL_PLATFORM_OPTIONS.map((platform) => (
                  <option key={platform.key} value={platform.key}>
                    {platform.label}
                  </option>
                ))}
              </select>

              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => moveLink(index, -1)} disabled={index === 0}>
                  Up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveLink(index, 1)}
                  disabled={index === links.length - 1}
                >
                  Down
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => removeLink(index)}>
                  Remove
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-gray-500">Label</p>
                <Input
                  value={link.label}
                  maxLength={60}
                  onChange={(event) => updateLink(index, { label: event.target.value })}
                  placeholder="LinkedIn"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-gray-500">URL</p>
                <Input
                  value={link.href}
                  maxLength={500}
                  onChange={(event) => updateLink(index, { href: event.target.value })}
                  placeholder="https://linkedin.com/company/publishroad"
                />
              </div>
            </div>
          </div>
        ))}

        {links.length === 0 ? <p className="text-sm text-gray-500">No social links configured yet.</p> : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={addLink} disabled={isSaving || links.length >= 20}>
          Add Social Account
        </Button>
        <Button className="bg-navy hover:bg-blue" onClick={saveLinks} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Social Links"}
        </Button>
      </div>
    </div>
  );
}
