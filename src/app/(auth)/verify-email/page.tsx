"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const cardStyle = {
  boxShadow: "0 8px 40px rgba(91, 88, 246, 0.08)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("An error occurred. Please try again.");
      });
  }, [token]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-[2rem] p-8 text-center" style={cardStyle}>
        {status === "loading" && (
          <>
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent mx-auto mb-4 animate-spin"
              style={{ borderColor: `rgba(91,88,246,0.2)`, borderTopColor: "var(--indigo)" }}
            />
            <p className="text-slate-500 font-light">Verifying your email...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(39, 174, 96, 0.1)" }}
            >
              <svg className="w-8 h-8" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
            >
              Email verified!
            </h2>
            <p className="text-slate-500 mb-6 font-light">
              Your email has been verified. You can now use all features of PublishRoad.
            </p>
            <Link href="/dashboard">
              <button
                className="rounded-full px-6 py-3 font-medium text-white btn-glow transition-all"
                style={{ backgroundColor: "var(--indigo)" }}
              >
                Go to Dashboard →
              </button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(192,57,43,0.1)" }}
            >
              <svg className="w-8 h-8" style={{ color: "var(--error)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
            >
              Verification failed
            </h2>
            <p className="text-slate-500 mb-6 font-light">{message}</p>
            <p className="text-sm text-slate-400 font-light">
              The link may have expired.{" "}
              <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>
                Sign in
              </Link>{" "}
              to request a new verification email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
