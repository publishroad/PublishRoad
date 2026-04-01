"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inFlightRef = useRef(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  async function onSubmit(data: ContactInput) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; success?: boolean; errorObj?: { message?: string } }
          | { error?: { message?: string } }
          | null;
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : payload && "error" in payload && typeof payload.error === "object"
              ? payload.error?.message ?? "Failed to send message. Please try again."
              : "Failed to send message. Please try again.";
        toast.error(message);
        return;
      }

      setSubmitted(true);
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div
          className="bg-white rounded-[2rem] p-8 text-center max-w-md w-full"
          style={{ boxShadow: "0 8px 40px rgba(91,88,246,0.08)", border: "1px solid rgba(226,232,240,0.8)" }}
        >
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
            Message sent!
          </h2>
          <p className="text-slate-500 font-light">
            Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 sm:px-6 py-16">
      <div
        className="bg-white rounded-[2rem] p-8"
        style={{ boxShadow: "0 8px 40px rgba(91,88,246,0.08)", border: "1px solid rgba(226,232,240,0.8)" }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 text-sm font-medium">
                    Name <span className="text-error">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" className="rounded-xl border-slate-200 h-11" {...field} />
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
                    <Input type="email" placeholder="you@example.com" className="rounded-xl border-slate-200 h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 text-sm font-medium">
                    Subject <span className="text-error">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="How can we help?" className="rounded-xl border-slate-200 h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 text-sm font-medium">
                    Message <span className="text-error">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us more..."
                      className="min-h-[120px] resize-none rounded-xl border-slate-200"
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
                fontWeight: 600, fontSize: "0.95rem", border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: "0 0 20px rgba(91,88,246,0.35)", transition: "all 0.2s",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </Form>
      </div>
    </div>
  );
}
