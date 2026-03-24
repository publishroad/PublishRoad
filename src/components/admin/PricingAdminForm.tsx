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
  credits: number;
  billingType: string;
  stripePriceId: string | null;
  isActive: boolean;
}

export function PricingAdminForm({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(plan: Plan) {
    setEditing(plan.id);
    setForm({ ...plan });
  }

  async function handleSave() {
    if (!editing || !form) return;
    setIsSaving(true);

    const res = await fetch(`/api/admin/pricing/${editing}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setIsSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save plan");
      return;
    }

    toast.success("Plan updated and pricing page revalidated");
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
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
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <span className="text-sm">Active (visible on pricing page)</span>
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
                </div>
                <div className="flex gap-4 mt-1 text-sm text-medium-gray">
                  <span>{formatCurrency(plan.priceCents, "USD")}</span>
                  <span>{plan.credits === -1 ? "Unlimited credits" : `${plan.credits} credits`}</span>
                  <span className="capitalize">{plan.billingType.replace("_", " ")}</span>
                </div>
                {plan.stripePriceId && (
                  <p className="text-xs text-medium-gray mt-0.5 font-mono">{plan.stripePriceId}</p>
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
