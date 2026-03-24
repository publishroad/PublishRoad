"use client";
// Static verification form — no real-time rendering needed

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Verify2FAPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  async function handleVerify() {
    setError(null);
    setIsLoading(true);

    const res = await fetch("/api/admin/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, isBackupCode: useBackup }),
    });

    setIsLoading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Invalid code");
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-ice-blue flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-border-gray p-8 w-full max-w-sm shadow-sm">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-navy rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-navy">Two-Factor Auth</h2>
          <p className="text-sm text-medium-gray mt-1">
            {useBackup
              ? "Enter one of your backup codes."
              : "Enter the code from your authenticator app."}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token">{useBackup ? "Backup Code" : "Authenticator Code"}</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => {
                const val = useBackup
                  ? e.target.value.toUpperCase().slice(0, 10)
                  : e.target.value.replace(/\D/g, "").slice(0, 6);
                setToken(val);
              }}
              placeholder={useBackup ? "XXXXXXXXXX" : "000000"}
              className="text-center font-mono tracking-widest text-lg"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={isLoading || token.length < 6}
            style={{
              display: "block", width: "100%", borderRadius: "999px",
              padding: "12px 24px", background: "#5B58F6", color: "#ffffff",
              fontWeight: 600, fontSize: "0.95rem", border: "none",
              cursor: (isLoading || token.length < 6) ? "not-allowed" : "pointer",
              opacity: (isLoading || token.length < 6) ? 0.6 : 1,
              boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
            }}
          >
            {isLoading ? "Verifying..." : "Verify"}
          </button>

          <button
            type="button"
            className="w-full text-xs text-medium-gray hover:text-navy text-center"
            onClick={() => {
              setUseBackup(!useBackup);
              setToken("");
              setError(null);
            }}
          >
            {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
          </button>
        </div>
      </div>
    </div>
  );
}
