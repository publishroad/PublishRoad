"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Plan { id: string; name: string; slug: string; credits: number; }
interface User { id: string; planId: string | null; creditsRemaining: number; }
interface AffiliateProfile {
  starterCommissionPct: number;
  hireUsCommissionPct: number;
  paypalEmail: string | null;
}

interface CreatorProfile {
  isEnabled: boolean;
  maxInvites: number;
  usedInvites: number;
  inviteToken: string;
  expiresAt: Date | null;
  disabledReason: string | null;
}

interface CreatorReferral {
  id: string;
  acceptedAt: Date;
  name: string | null;
  email: string;
}

export function UserAdminPanel({
  user,
  plans,
  affiliateProfile,
  creatorProfile,
  creatorReferrals,
}: {
  user: User;
  plans: Plan[];
  affiliateProfile: AffiliateProfile;
  creatorProfile: CreatorProfile;
  creatorReferrals: CreatorReferral[];
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(user.planId ?? "");
  const [credits, setCredits] = useState(user.creditsRemaining);
  const [creditAdjust, setCreditAdjust] = useState(0);
  const [starterCommissionPct, setStarterCommissionPct] = useState(affiliateProfile.starterCommissionPct);
  const [hireUsCommissionPct, setHireUsCommissionPct] = useState(affiliateProfile.hireUsCommissionPct);
  const [referralPaypalEmail, setReferralPaypalEmail] = useState(affiliateProfile.paypalEmail ?? "");
  const [creatorEnabled, setCreatorEnabled] = useState(creatorProfile.isEnabled);
  const [creatorMaxInvites, setCreatorMaxInvites] = useState(creatorProfile.maxInvites);
  const [creatorExpiresAt, setCreatorExpiresAt] = useState(
    creatorProfile.expiresAt ? new Date(creatorProfile.expiresAt).toISOString().slice(0, 10) : ""
  );
  const [creatorDisabledReason, setCreatorDisabledReason] = useState(creatorProfile.disabledReason ?? "");
  const [creatorInviteToken, setCreatorInviteToken] = useState(creatorProfile.inviteToken ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const invitePath = creatorInviteToken ? `/invite/${creatorInviteToken}` : "";
  const inviteLink = creatorInviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${invitePath}`
    : "";
  const remainingInvites = Math.max(0, creatorMaxInvites - creatorProfile.usedInvites);

  async function handleSave() {
    setIsSaving(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: planId || null,
        creditsRemaining: credits,
        starterCommissionPct,
        hireUsCommissionPct,
        referralPaypalEmail,
        contentCreatorEnabled: creatorEnabled,
        contentCreatorMaxInvites: creatorMaxInvites,
        contentCreatorExpiresAt: creatorExpiresAt || null,
        contentCreatorDisabledReason: creatorEnabled ? null : creatorDisabledReason || null,
      }),
    });
    setIsSaving(false);
    if (!res.ok) { toast.error("Failed to update"); return; }
    toast.success("User updated");
    router.refresh();
  }

  async function handleRegenerateInviteToken() {
    setIsSaving(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentCreatorEnabled: creatorEnabled,
        contentCreatorMaxInvites: creatorMaxInvites,
        contentCreatorExpiresAt: creatorExpiresAt || null,
        contentCreatorDisabledReason: creatorEnabled ? null : creatorDisabledReason || null,
        regenerateCreatorToken: true,
      }),
    });
    setIsSaving(false);
    if (!res.ok) {
      toast.error("Failed to regenerate invite token");
      return;
    }

    const payload = (await res.json().catch(() => null)) as { creatorInviteToken?: string } | null;
    if (payload?.creatorInviteToken) {
      setCreatorInviteToken(payload.creatorInviteToken);
    }
    toast.success("Creator invite token regenerated");
    router.refresh();
  }

  async function handleCopyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied");
    } catch {
      toast.error("Failed to copy invite link");
    }
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

      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy">Affiliate Settings</h2>
        <p className="text-sm text-medium-gray">Defaults are 25% on starter plans and 15% on Hire Us purchases.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Starter Commission %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={starterCommissionPct}
              onChange={(e) => setStarterCommissionPct(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hire Us Commission %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={hireUsCommissionPct}
              onChange={(e) => setHireUsCommissionPct(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>PayPal Email (for payout)</Label>
          <Input
            type="email"
            value={referralPaypalEmail}
            onChange={(e) => setReferralPaypalEmail(e.target.value)}
            placeholder="affiliate@paypal.com"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy">Content Creator Access</h2>
        <p className="text-sm text-medium-gray">Enable invite-based free Pro access without payouts or commissions.</p>

        <label className="flex items-center gap-2 text-sm text-dark-gray">
          <input
            type="checkbox"
            checked={creatorEnabled}
            onChange={(e) => setCreatorEnabled(e.target.checked)}
          />
          Enable Content Creator access
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Max Invites</Label>
            <Input
              type="number"
              min={0}
              value={creatorMaxInvites}
              onChange={(e) => setCreatorMaxInvites(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Optional Expiry Date</Label>
            <Input
              type="date"
              value={creatorExpiresAt}
              onChange={(e) => setCreatorExpiresAt(e.target.value)}
            />
          </div>
        </div>

        {!creatorEnabled && (
          <div className="space-y-1.5">
            <Label>Disabled Reason</Label>
            <Input
              value={creatorDisabledReason}
              onChange={(e) => setCreatorDisabledReason(e.target.value)}
              placeholder="Optional reason shown internally"
            />
          </div>
        )}

        <div className="rounded-lg border border-border-gray bg-[#f8fafc] p-4 space-y-2">
          <p className="text-sm font-medium text-dark-gray">Invite Link</p>
          <p className="text-xs text-medium-gray break-all">{inviteLink || "Enable and save to generate a link."}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCopyInviteLink} disabled={!inviteLink}>
              Copy Link
            </Button>
            <Button type="button" variant="outline" onClick={handleRegenerateInviteToken} disabled={isSaving}>
              Regenerate Token
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border-gray p-3">
            <p className="text-xs text-medium-gray">Total Invites</p>
            <p className="text-lg font-semibold text-dark-gray">{creatorMaxInvites}</p>
          </div>
          <div className="rounded-lg border border-border-gray p-3">
            <p className="text-xs text-medium-gray">Used</p>
            <p className="text-lg font-semibold text-dark-gray">{creatorProfile.usedInvites}</p>
          </div>
          <div className="rounded-lg border border-border-gray p-3">
            <p className="text-xs text-medium-gray">Remaining</p>
            <p className="text-lg font-semibold text-dark-gray">{remainingInvites}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-dark-gray">Recent Referred Users</p>
          {creatorReferrals.length === 0 ? (
            <p className="text-sm text-medium-gray">No creator referrals yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-medium-gray">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2">Accepted</th>
                  </tr>
                </thead>
                <tbody>
                  {creatorReferrals.map((row) => (
                    <tr key={row.id} className="border-t border-border-gray">
                      <td className="py-2 pr-4 text-dark-gray">{row.name ?? "-"}</td>
                      <td className="py-2 pr-4 text-dark-gray">{row.email}</td>
                      <td className="py-2 text-dark-gray">{new Date(row.acceptedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Button className="bg-navy hover:bg-blue" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Creator Settings"}
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
