"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Plan { id: string; name: string; slug: string; credits: number; }
interface User { id: string; planId: string | null; creditsRemaining: number; }

export function UserAdminPanel({ user, plans }: { user: User; plans: Plan[] }) {
  const router = useRouter();
  const [planId, setPlanId] = useState(user.planId ?? "");
  const [credits, setCredits] = useState(user.creditsRemaining);
  const [creditAdjust, setCreditAdjust] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: planId || null, creditsRemaining: credits }),
    });
    setIsSaving(false);
    if (!res.ok) { toast.error("Failed to update"); return; }
    toast.success("User updated");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this user account? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("User deleted");
    router.push("/admin/users");
  }

  return (
    <div className="space-y-4">
      {/* Plan & Credits */}
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy">Plan & Credits</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Override Plan</Label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Free (no plan)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Credits Remaining (-1 = unlimited)</Label>
            <Input
              type="number"
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Adjust Credits</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={creditAdjust}
              onChange={(e) => setCreditAdjust(Number(e.target.value))}
              placeholder="+5 or -2"
              className="w-32"
            />
            <Button
              variant="outline"
              onClick={() => setCredits((c) => Math.max(0, c + creditAdjust))}
            >
              Apply Adjustment
            </Button>
          </div>
        </div>
        <Button className="bg-navy hover:bg-blue" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Danger */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="font-semibold text-error mb-2">Danger Zone</h2>
        <p className="text-sm text-medium-gray mb-4">
          Permanently delete this user and all their data.
        </p>
        <Button variant="destructive" onClick={handleDelete}>
          Delete User Account
        </Button>
      </div>
    </div>
  );
}
