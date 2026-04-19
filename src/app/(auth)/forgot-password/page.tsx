"use client";

import { useState } from "react";
import Link from "next/link";
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
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

const cardStyle = {
  boxShadow: "0 8px 40px rgba(91, 88, 246, 0.08)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
};

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof payload.error === "string" ? payload.error : "Could not send reset email.";
        toast.error(message);
        return;
      }

      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative w-full max-w-md bg-white rounded-[2rem] p-8 text-center" style={cardStyle}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(91,88,246,0.1)" }}
          >
            <svg className="w-8 h-8" style={{ color: "var(--indigo)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
          >
            Check your email
          </h2>
          <p className="text-slate-500 mb-6 font-light">
            If an account exists for that email, we&apos;ve sent a password reset link. Check your inbox and spam folder.
          </p>
          <Link href="/login" className="text-sm font-medium hover:underline" style={{ color: "var(--indigo)" }}>
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-3xl font-bold inline-block"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
          >
            Publish<span style={{ color: "var(--indigo)" }}>Road</span>
          </Link>
          <p className="text-slate-500 mt-2 font-light">Reset your password</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8" style={cardStyle}>
          <div className="text-center mb-6">
            <h1
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
            >
              Forgot password?
            </h1>
            <p className="text-slate-500 mt-1 text-sm font-light">Enter your email to receive a reset link</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  display: "block", width: "100%", borderRadius: "999px",
                  padding: "12px 24px", background: "#5B58F6", color: "#ffffff",
                  fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </Form>

          <p className="text-center text-sm text-slate-500 mt-6 font-light">
            <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
