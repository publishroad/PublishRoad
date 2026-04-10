"use client";

import { Suspense, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

const ONBOARDING_PLAN_PATH = "/onboarding/plan";
const HIRE_US_ONBOARDING_PATH = "/onboarding/hire-us";

function extractHireUsPackageFromCallback(callbackUrl: string | null): "starter" | "complete" | null {
  if (!callbackUrl) return null;
  try {
    const url = new URL(callbackUrl, "http://localhost");
    if (url.pathname === HIRE_US_ONBOARDING_PATH) {
      const pkg = url.searchParams.get("package");
      if (pkg === "starter" || pkg === "complete") return pkg;
    }
  } catch {
    // Invalid URL, ignore
  }
  return null;
}

function resolveSignupRedirectTarget(callbackUrl: string | null): string {
  if (callbackUrl) {
    try {
      const url = new URL(callbackUrl, "http://localhost");
      if (url.pathname === HIRE_US_ONBOARDING_PATH) {
        return `${url.pathname}${url.search}`;
      }
    } catch {
      // Ignore invalid callback URL and use default onboarding flow.
    }
  }
  return ONBOARDING_PLAN_PATH;
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const referralCode = searchParams.get("ref")?.trim() || undefined;
  const redirectTarget = resolveSignupRedirectTarget(callbackUrl);
  const hireUsPackage = extractHireUsPackageFromCallback(callbackUrl);
  const [isLoading, setIsLoading] = useState(false);
  const inFlightRef = useRef(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: SignupInput) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, referralCode }),
      });

      let result: { error?: string | { code?: string; message?: string } } = {};
      const raw = await response.text();
      if (raw) {
        try {
          result = JSON.parse(raw) as { error?: string };
        } catch {
          result = {};
        }
      }

      if (!response.ok) {
        const message =
          typeof result.error === "string"
            ? result.error
            : result.error?.message ?? "Failed to create account";
        toast.error(message);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: redirectTarget,
      });

      if (!signInResult || signInResult.error) {
        toast.error("Account created, but auto sign-in failed. Please log in.");
        router.push(`/login?${new URLSearchParams({ callbackUrl: redirectTarget }).toString()}`);
        return;
      }

      toast.success("Account created! Let's get you set up.");
      router.push(redirectTarget);
    } catch {
      toast.error("Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }

  async function handleGoogleSignup() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);

    if (referralCode) {
      try {
        await fetch("/api/referrals/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode }),
        });
      } catch {
        // Continue Google auth flow even if capture endpoint is temporarily unavailable.
      }
    }

    await signIn("google", { callbackUrl: redirectTarget });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" style={{ textDecoration: "none" }}>
            <Image src="/logo.png" alt="PublishRoad" width={160} height={46} sizes="160px" style={{ height: "auto" }} priority />
          </Link>
          <p className="text-slate-500 mt-2 font-light">Create your free account</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[2rem] p-8"
          style={{
            boxShadow: "0 8px 40px rgba(91, 88, 246, 0.08)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
          {/* Hire Us Banner */}
          {hireUsPackage && (
            <div style={{
              background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
              borderRadius: "1rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              color: "#ffffff",
              fontSize: "0.875rem",
            }}>
              <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                Signing up for Hire Us {hireUsPackage === "starter" ? "Starter" : "Complete"}
              </p>
              <p style={{ fontSize: "0.8rem", opacity: 0.95, lineHeight: 1.4 }}>
                You&apos;ll get 1 free curation to test our work. Then purchase your package to launch your full service.
              </p>
            </div>
          )}
          {referralCode && (
            <div
              style={{
                background: "#EEF2FF",
                borderRadius: "0.9rem",
                padding: "0.75rem 0.9rem",
                marginBottom: "1rem",
                color: "#334155",
                fontSize: "0.82rem",
                border: "1px solid #dbe2ff",
              }}
            >
              Referral applied: <span style={{ fontWeight: 600 }}>{referralCode}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              width: "100%", marginBottom: "1rem", borderRadius: "999px",
              padding: "11px 24px", background: "#ffffff", color: "#475569",
              fontWeight: 500, fontSize: "0.875rem", border: "1px solid #e2e8f0",
              cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-slate-400 font-light">or</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 text-sm font-medium">
                      Full Name <span className="text-error">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jane Smith"
                        autoComplete="name"
                        className="rounded-xl border-slate-200 h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 text-sm font-medium">
                      Email <span className="text-error">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="rounded-xl border-slate-200 h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 text-sm font-medium">
                      Password <span className="text-error">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="rounded-xl border-slate-200 h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-slate-400 font-light">
                      Must include uppercase, number, and special character
                    </p>
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  display: "block", width: "100%", borderRadius: "999px",
                  padding: "12px 24px", background: "#5B58F6", color: "#ffffff",
                  fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
                  opacity: isLoading ? 0.7 : 1, marginTop: "0.25rem",
                }}
              >
                {isLoading ? "Creating account..." : "Create Free Account"}
              </button>
            </form>
          </Form>

          <p className="text-xs text-slate-400 text-center mt-4 font-light">
            By signing up you agree to our{" "}
            <Link href="/terms" className="hover:underline" style={{ color: "var(--indigo)" }}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:underline" style={{ color: "var(--indigo)" }}>
              Privacy Policy
            </Link>
          </p>

          <p className="text-center text-sm text-slate-500 mt-4 font-light">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "var(--indigo)" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
