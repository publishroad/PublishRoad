"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  credits: number;
  billingType: string;
  stripePriceId: string | null;
  isActive: boolean;
  isVisible: boolean;
  features: unknown;
}

const MAX_FEATURES = 10;
const MAX_FEATURE_LENGTH = 160;

function normalizeFeatures(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const deduped = new Set<string>();
  const normalized: string[] = [];

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const clipped = trimmed.slice(0, MAX_FEATURE_LENGTH);
    if (deduped.has(clipped)) continue;
    deduped.add(clipped);
    normalized.push(clipped);
    if (normalized.length >= MAX_FEATURES) break;
  }

  return normalized;
}

function featuresToLines(input: unknown): string {
  return normalizeFeatures(input).join("\n");
}

function parseFeatureLines(lines: string): string[] {
  const parsed = lines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(0, MAX_FEATURE_LENGTH));

  return normalizeFeatures(parsed);
}

export function PricingAdminForm({
  plans,
  initialFreePlanFullAccessEnabled,
}: {
  plans: Plan[];
  initialFreePlanFullAccessEnabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [featuresInput, setFeaturesInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [freePlanFullAccessEnabled, setFreePlanFullAccessEnabled] = useState(
    initialFreePlanFullAccessEnabled
  );
  const [isSavingLaunchToggle, setIsSavingLaunchToggle] = useState(false);

  function startEdit(plan: Plan) {
    setEditing(plan.id);
    setForm({ ...plan });
    setFeaturesInput(featuresToLines(plan.features));
  }

  async function handleSave() {
    if (!editing || !form) return;
    setIsSaving(true);

    const payload = {
      ...form,
      features: parseFeatureLines(featuresInput),
    };

    const res = await fetch(`/api/admin/pricing/${editing}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save plan");
      return;
    }

    toast.success("Plan updated and pricing page revalidated");
    setEditing(null);
    setFeaturesInput("");
    router.refresh();
  }

  async function handleSaveFreePlanAccessToggle() {
    setIsSavingLaunchToggle(true);

    const res = await fetch("/api/admin/pricing/free-full-access", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: freePlanFullAccessEnabled }),
    });

    setIsSavingLaunchToggle(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update free plan full-access toggle");
      return;
    }

    toast.success(
      freePlanFullAccessEnabled
        ? "Free plan full-access is now enabled"
        : "Free plan restrictions are now active"
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <div>
          <p className="font-semibold text-navy">Launch Control</p>
          <p className="text-sm text-medium-gray mt-1">
            Enable full curation access for all users on the Free plan without changing paid plans.
          </p>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={freePlanFullAccessEnabled}
            onChange={(e) => setFreePlanFullAccessEnabled(e.target.checked)}
          />
          <span className="text-sm">Free Plan Full Access</span>
        </label>

        <Button
          className="bg-navy hover:bg-blue"
          onClick={handleSaveFreePlanAccessToggle}
          disabled={isSavingLaunchToggle}
        >
          {isSavingLaunchToggle ? "Saving..." : "Save Launch Control"}
        </Button>
      </div>

      {plans.map((plan) => (
        <div key={plan.id} className="bg-white rounded-xl border border-border-gray p-6">
          {editing === plan.id ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Plan Name</Label>
                  <Input
                    value={form.name ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Price (cents)</Label>
                  <Input
                    type="number"
                    value={form.priceCents ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, priceCents: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-medium-gray">
                    = {formatCurrency(form.priceCents ?? 0, "USD")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Actual/List Price (cents)</Label>
                  <Input
                    type="number"
                    value={form.compareAtPriceCents ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      setForm((f) => ({
                        ...f,
                        compareAtPriceCents: raw === "" ? null : Number(raw),
                      }));
                    }}
                    placeholder="Optional"
                  />
                  <p className="text-xs text-medium-gray">
                    = {form.compareAtPriceCents == null ? "Not set" : formatCurrency(form.compareAtPriceCents, "USD")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Credits (-1 = unlimited)</Label>
                  <Input
                    type="number"
                    value={form.credits ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Billing Type</Label>
                  <select
                    value={form.billingType ?? "one_time"}
                    onChange={(e) => setForm((f) => ({ ...f, billingType: e.target.value }))}
                    className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="one_time">One Time</option>
                    <option value="monthly">Monthly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Stripe Price ID</Label>
                  <Input
                    value={form.stripePriceId ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, stripePriceId: e.target.value }))}
                    placeholder="price_..."
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Plan Features (one bullet per line)</Label>
                  <textarea
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm"
                    placeholder="Everything in Starter&#10;All 6 sections unlocked&#10;Priority support"
                  />
                  <p className="text-xs text-medium-gray">
                    Up to {MAX_FEATURES} bullets, {MAX_FEATURE_LENGTH} characters each.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <span className="text-sm">Active (can be purchased)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isVisible ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
                />
                <span className="text-sm">Visible (shown on pricing and onboarding)</span>
              </label>
              <div className="flex gap-2">
                <Button
                  className="bg-navy hover:bg-blue"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Plan"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-navy">{plan.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? "bg-green-100 text-success" : "bg-gray-100 text-medium-gray"}`}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isVisible ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-medium-gray"}`}>
                    {plan.isVisible ? "Visible" : "Hidden"}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-sm text-medium-gray">
                  {plan.compareAtPriceCents != null && plan.compareAtPriceCents > plan.priceCents && (
                    <span className="line-through text-gray-400">{formatCurrency(plan.compareAtPriceCents, "USD")}</span>
                  )}
                  <span>{formatCurrency(plan.priceCents, "USD")}</span>
                  <span>{plan.credits === -1 ? "Unlimited credits" : `${plan.credits} credits`}</span>
                  <span className="capitalize">{plan.billingType.replace("_", " ")}</span>
                </div>
                {plan.stripePriceId && (
                  <p className="text-xs text-medium-gray mt-0.5 font-mono">{plan.stripePriceId}</p>
                )}
                {normalizeFeatures(plan.features).length > 0 && (
                  <p className="text-xs text-medium-gray mt-1.5">
                    Features: {normalizeFeatures(plan.features).slice(0, 3).join(" • ")}
                    {normalizeFeatures(plan.features).length > 3 ? " • ..." : ""}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => startEdit(plan)}>
                Edit
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
