"use client";
// Static 2FA setup form — no real-time rendering needed

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Setup2FAPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"setup" | "backup">("setup");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auth/setup-2fa")
      .then((r) => r.json())
      .then((data) => {
        setQrCode(data.qrCode);
        setSecret(data.secret);
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  async function handleVerify() {
    setError(null);
    setIsLoading(true);
    const res = await fetch("/api/admin/auth/setup-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setIsLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Invalid code");
      return;
    }

    const data = await res.json();
    setBackupCodes(data.backupCodes);
    setStep("backup");
  }

  if (step === "backup") {
    return (
      <div className="min-h-screen bg-ice-blue flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-border-gray p-8 w-full max-w-md shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-navy">2FA Enabled</h2>
            <p className="text-sm text-medium-gray mt-1">
              Save these backup codes in a safe place.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm grid grid-cols-2 gap-2 mb-6">
            {backupCodes.map((code) => (
              <span key={code} className="text-dark-gray">{code}</span>
            ))}
          </div>
          <p className="text-xs text-medium-gray mb-4 text-center">
            Each backup code can only be used once. Store them securely.
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/dashboard")}
            style={{
              display: "block", width: "100%", borderRadius: "999px",
              padding: "12px 24px", background: "#5B58F6", color: "#ffffff",
              fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: "pointer",
              boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
            }}
          >
            Continue to Admin Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ice-blue flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-border-gray p-8 w-full max-w-sm shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-navy">Set Up 2FA</h2>
          <p className="text-sm text-medium-gray mt-1">
            Scan the QR code with your authenticator app.
          </p>
        </div>

        {qrCode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrCode} alt="2FA QR Code" width={160} height={160} className="mx-auto mb-4 w-40 h-40" />
        ) : (
          <div className="w-40 h-40 bg-gray-100 animate-pulse rounded mx-auto mb-4" />
        )}

        {secret && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-center">
            <p className="text-xs text-medium-gray mb-1">Manual entry key</p>
            <p className="font-mono text-sm text-dark-gray break-all">{secret}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="token">Verification Code</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center font-mono tracking-widest text-lg"
              maxLength={6}
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <button
            type="button"
            onClick={handleVerify}
            disabled={token.length !== 6 || isLoading}
            style={{
              display: "block", width: "100%", borderRadius: "999px",
              padding: "12px 24px", background: "#5B58F6", color: "#ffffff",
              fontWeight: 600, fontSize: "0.95rem", border: "none",
              cursor: (token.length !== 6 || isLoading) ? "not-allowed" : "pointer",
              opacity: (token.length !== 6 || isLoading) ? 0.6 : 1,
              boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
            }}
          >
            {isLoading ? "Verifying..." : "Enable 2FA"}
          </button>
        </div>
      </div>
    </div>
  );
}
