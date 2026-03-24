"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const btnPrimary: React.CSSProperties = {
  display: "inline-block", borderRadius: "999px",
  padding: "9px 20px", background: "#5B58F6", color: "#ffffff",
  fontWeight: 600, fontSize: "0.875rem", textDecoration: "none",
  boxShadow: "0 0 16px rgba(91,88,246,0.35)", transition: "all 0.2s",
};

const btnGhost: React.CSSProperties = {
  display: "inline-block", borderRadius: "999px",
  padding: "9px 20px", color: "#475569",
  fontWeight: 500, fontSize: "0.875rem", textDecoration: "none",
  transition: "all 0.2s",
};

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "#020617", textDecoration: "none" }}
          >
            Publish<span style={{ color: "#5B58F6" }}>Road</span>
          </Link>

          {/* Desktop Nav — center pill */}
          <nav className="hidden lg:flex items-center">
            <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-full px-2 py-1 shadow-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-dark hover:bg-white transition-all duration-200"
                  style={{ textDecoration: "none" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {session ? (
              <Link href="/dashboard" style={btnPrimary}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" style={btnGhost}>
                  Sign In
                </Link>
                <Link href="/signup" style={btnPrimary}>
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="lg:hidden inline-flex items-center justify-center rounded-full p-2 text-slate-600 hover:bg-white/60 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white/90 backdrop-blur-xl border-l border-white/40">
              <div className="flex flex-col gap-2 mt-10">
                <p
                  className="text-lg font-bold mb-4 px-2"
                  style={{ fontFamily: "var(--font-heading)", color: "#020617" }}
                >
                  Publish<span style={{ color: "#5B58F6" }}>Road</span>
                </p>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-slate-600 font-medium text-base py-2.5 px-4 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    style={{ textDecoration: "none" }}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-3 mt-6 px-2">
                  {session ? (
                    <Link
                      href="/dashboard"
                      style={{ ...btnPrimary, display: "block", textAlign: "center" }}
                      onClick={() => setOpen(false)}
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        style={{
                          display: "block", textAlign: "center", borderRadius: "999px",
                          padding: "10px 20px", background: "#ffffff", color: "#475569",
                          fontWeight: 500, fontSize: "0.875rem", textDecoration: "none",
                          border: "1px solid #e2e8f0",
                        }}
                        onClick={() => setOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        style={{ ...btnPrimary, display: "block", textAlign: "center" }}
                        onClick={() => setOpen(false)}
                      >
                        Get Started Free
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
