"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "publishroad_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        animation: "cookieSlideUp 0.4s ease-out",
        background: "rgba(15, 23, 42, 0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <style>{`
        @keyframes cookieSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-xl shrink-0 mt-0.5">🍪</span>
            <div>
              <p className="text-white text-sm font-medium">We use cookies to improve your experience</p>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                We use essential cookies for authentication and optional analytics cookies to understand how you use PublishRoad. See our{" "}
                <Link href="/privacy" className="underline text-slate-300 hover:text-white">
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={reject}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Reject Non-Essential
            </button>
            <button
              onClick={accept}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #2E75B6, #1A3C6E)" }}
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
