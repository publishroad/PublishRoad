"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const { data: session, status, update } = useSession();
  const [isValidatingSession, setIsValidatingSession] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setIsValidatingSession(false);
      return;
    }

    if (typeof window !== "undefined" && window.sessionStorage.getItem("navbar-session-validated") === "1") {
      setIsValidatingSession(false);
      return;
    }

    let cancelled = false;

    update()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled && typeof window !== "undefined") {
          window.sessionStorage.setItem("navbar-session-validated", "1");
        }

        if (!cancelled) {
          setIsValidatingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, update]);

  const isSessionLoading = status === "loading" || isValidatingSession;
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <Image src="/logo.png" alt="PublishRoad" width={140} height={40} sizes="140px" style={{ height: "auto" }} priority />
          </Link>

          {/* Desktop Nav — center pill */}
          <nav className="hidden lg:flex items-center">
            <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-full px-2 py-1 shadow-sm">
              {navLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
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
            {isSessionLoading ? null : isAuthenticated ? (
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "rounded-full px-5 text-sm shadow-[0_0_16px_rgba(91,88,246,0.35)]"
                )}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: "ghost" }), "rounded-full px-5 text-sm text-slate-600")}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "rounded-full px-5 text-sm shadow-[0_0_16px_rgba(91,88,246,0.35)]"
                  )}
                >
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
                <div className="mb-4 px-2">
                  <Image src="/logo.png" alt="PublishRoad" width={120} height={34} sizes="120px" style={{ height: "auto" }} />
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className="text-slate-600 font-medium text-base py-2.5 px-4 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    style={{ textDecoration: "none" }}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-3 mt-6 px-2">
                  {isSessionLoading ? null : isAuthenticated ? (
                    <Link
                      href="/dashboard"
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "block rounded-full px-5 text-center text-sm shadow-[0_0_16px_rgba(91,88,246,0.35)]"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "block rounded-full border-slate-200 bg-white px-5 text-center text-sm text-slate-600"
                        )}
                        onClick={() => setOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        className={cn(
                          buttonVariants({ variant: "default" }),
                          "block rounded-full px-5 text-center text-sm shadow-[0_0_16px_rgba(91,88,246,0.35)]"
                        )}
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
