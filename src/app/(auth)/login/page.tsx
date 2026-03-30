"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

type CredentialsResult = {
  success: boolean;
  errorMessage?: string;
  redirectUrl?: string;
};

function mapCredentialsCodeToMessage(code?: string | null): string {
  if (code === "email_not_found") {
    return "Email is not registered.";
  }

  if (code === "wrong_password") {
    return "Password is incorrect.";
  }

  if (code === "social_login_only") {
    return "This account uses Google login. Please continue with Google.";
  }

  if (code === "account_locked") {
    return "Account temporarily locked. Please try again in 30 minutes.";
  }

  return "Invalid email or password.";
}

function parseCredentialsSignInResult(
  result: { error?: string | null; status?: number; url?: string | null } | undefined
): CredentialsResult {
  if (!result) {
    return { success: false, errorMessage: "Invalid email or password." };
  }

  if (!result.url) {
    return { success: false, errorMessage: "Invalid email or password." };
  }

  // NextAuth may return a URL containing ?error=... even when result.error is empty.
  try {
    const url = new URL(result.url, window.location.origin);
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");

    if (error === "CredentialsSignin") {
      return { success: false, errorMessage: mapCredentialsCodeToMessage(code) };
    }

    if (error) {
      const code = url.searchParams.get("code");
      if (code === "account_locked") {
        return {
          success: false,
          errorMessage: "Account temporarily locked. Please try again in 30 minutes.",
        };
      }
      return { success: false, errorMessage: "Invalid email or password." };
    }
  } catch {
    // Ignore URL parse issues and fall back to default behavior.
  }

  if (result.error || (typeof result.status === "number" && result.status >= 400)) {
    return { success: false, errorMessage: "Invalid email or password." };
  }

  return { success: true, redirectUrl: result.url };
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "2rem",
  padding: "2rem",
  boxShadow: "0 8px 40px rgba(91,88,246,0.09)",
  border: "1px solid rgba(226,232,240,0.9)",
};

const btnPrimary: React.CSSProperties = {
  display: "block",
  width: "100%",
  borderRadius: "999px",
  padding: "12px 24px",
  background: "#5B58F6",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "0.95rem",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 0 20px rgba(91,88,246,0.35)",
  transition: "all 0.2s",
  textAlign: "center",
};

const btnOutline: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  borderRadius: "999px",
  padding: "11px 24px",
  background: "#ffffff",
  color: "#475569",
  fontWeight: 500,
  fontSize: "0.875rem",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  transition: "all 0.2s",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!error || error === "account_exists") return;

    if (error === "CredentialsSignin") {
      setAuthError(mapCredentialsCodeToMessage(code));
      return;
    }

    if (error === "CallbackRouteError") {
      setAuthError("Account temporarily locked. Please try again in 30 minutes.");
      return;
    }

    setAuthError("Sign-in failed. Please try again.");
  }, [code, error]);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (authError) {
        setAuthError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [authError, form]);

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    setAuthError(null);
    try {
      // Prevent open redirects and ensure dashboard is default target.
      const safeCallbackUrl = callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });

      const parsedResult = parseCredentialsSignInResult(result);
      if (!parsedResult.success) {
        setFailedAttempts((prev) => prev + 1);
        setAuthError(parsedResult.errorMessage ?? "Invalid email or password.");
        return;
      }

      window.location.assign(parsedResult.redirectUrl!);
    } catch (error) {
      console.error("Sign in error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(91,88,246,0.08) 0%, transparent 60%), #FAFAFA",
        position: "relative",
      }}
    >
      {/* Dot grid */}
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.3,
          backgroundImage: "radial-gradient(circle, #c7c5fb 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div style={{ position: "relative", width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
            <Image src="/logo.png" alt="PublishRoad" width={160} height={46} sizes="160px" style={{ height: "auto" }} priority />
          </Link>
          <p style={{ color: "#64748b", marginTop: "0.375rem", fontWeight: 300, fontSize: "0.95rem" }}>
            Sign in to your account
          </p>
        </div>

        <div style={cardStyle}>
          {/* Error banner */}
          {error === "account_exists" && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "1rem", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", color: "#9a3412" }}>
              An account with this email already exists. Please sign in with your password.
            </div>
          )}

          {/* Google */}
          <button type="button" style={btnOutline} onClick={handleGoogleSignIn} disabled={isLoading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.25rem 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
            <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 300 }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 500 }}>
                      Email <span style={{ color: "#C0392B" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" className="rounded-xl border-slate-200 h-11" {...field} />
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <FormLabel style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 500 }}>
                        Password <span style={{ color: "#C0392B" }}>*</span>
                      </FormLabel>
                      <Link href="/forgot-password" style={{ color: "#5B58F6", fontSize: "0.8rem", fontWeight: 500, textDecoration: "none" }}>
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="current-password" className="rounded-xl border-slate-200 h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {authError && (
                <p style={{ color: "#B42318", fontSize: "0.875rem", fontWeight: 500, marginTop: "-0.25rem" }}>
                  {authError}
                </p>
              )}

              {failedAttempts >= 3 && (
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "1rem", padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#9a3412" }}>
                  Multiple failed attempts. Please verify you are human.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...btnPrimary,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  marginTop: "0.25rem",
                }}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </Form>

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b", marginTop: "1.5rem", fontWeight: 300 }}>
            Don&apos;t have an account?{" "}
            <Link href={`/signup?${new URLSearchParams({ callbackUrl }).toString()}`} style={{ color: "#5B58F6", fontWeight: 500, textDecoration: "none" }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
