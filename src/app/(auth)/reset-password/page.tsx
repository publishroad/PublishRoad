"use client";

import { useState } from "react";
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
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "2rem",
  padding: "2rem",
  boxShadow: "0 8px 40px rgba(91,88,246,0.09)",
  border: "1px solid rgba(226,232,240,0.9)",
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully!");
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", padding: "1.5rem",
          background: "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(91,88,246,0.08) 0%, transparent 60%), #FAFAFA",
        }}
      >
        <div style={{ ...cardStyle, textAlign: "center", maxWidth: "440px", width: "100%" }}>
          <p style={{ color: "#C0392B", marginBottom: "1rem" }}>Invalid or missing reset token.</p>
          <Link href="/forgot-password" style={{ color: "#5B58F6", fontWeight: 500, textDecoration: "none" }}>
            Request a new reset link
          </Link>
        </div>
      </div>
    );
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
            Set your new password
          </p>
        </div>

        <div style={cardStyle}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="hidden" {...form.register("token")} />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 500 }}>
                      New Password <span style={{ color: "#C0392B" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min. 8 characters" autoComplete="new-password" className="rounded-xl border-slate-200 h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 500 }}>
                      Confirm Password <span style={{ color: "#C0392B" }}>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Repeat your password" autoComplete="new-password" className="rounded-xl border-slate-200 h-11" {...field} />
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
                  fontWeight: 600, fontSize: "0.95rem", border: "none",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
                  opacity: isLoading ? 0.7 : 1, marginTop: "0.25rem",
                }}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </Form>

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b", marginTop: "1.5rem", fontWeight: 300 }}>
            <Link href="/login" style={{ color: "#5B58F6", fontWeight: 500, textDecoration: "none" }}>
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
