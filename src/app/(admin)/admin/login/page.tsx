"use client";
// Static login form - no server-side dynamic rendering needed

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Invalid credentials");
        return;
      }

      const result = await res.json();
      if (result.requireTotp) {
        router.push("/admin/verify-2fa");
      } else if (result.requireSetup) {
        router.push("/admin/setup-2fa");
      } else {
        router.push("/admin/dashboard");
      }
    } catch {
      setError("Connection error. Make sure the server and database are running.");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: "var(--dark)" }}
    >
      {/* Dark mesh bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(91,88,246,0.2) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <Image src="/logo.png" alt="PublishRoad" width={150} height={43} sizes="150px" style={{ filter: "brightness(0) invert(1)", height: "auto" }} priority />
          </div>
          <p className="text-slate-400 text-sm mt-1 font-light">Admin Portal</p>
        </div>

        <div
          className="rounded-[2rem] p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-6 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "rgba(91, 88, 246, 0.2)", border: "1px solid rgba(91,88,246,0.3)" }}
            >
              <svg className="w-5 h-5" style={{ color: "var(--indigo)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Admin Sign In
            </h1>
            <p className="text-sm text-slate-400 font-light mt-1">Restricted access</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-3 py-2 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                autoFocus
                className="rounded-xl h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500"
              />
              {formState.errors.email && (
                <p className="text-xs text-red-400">{formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className="rounded-xl h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500"
              />
              {formState.errors.password && (
                <p className="text-xs text-red-400">{formState.errors.password.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={formState.isSubmitting}
              style={{
                display: "block", width: "100%", borderRadius: "999px",
                padding: "12px 24px", background: "#5B58F6", color: "#ffffff",
                fontWeight: 600, fontSize: "0.95rem", border: "none",
                cursor: formState.isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
                opacity: formState.isSubmitting ? 0.7 : 1, marginTop: "0.5rem",
              }}
            >
              {formState.isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
