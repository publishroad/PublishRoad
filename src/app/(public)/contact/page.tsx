"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const contactSchema = z.object({
  name: z.string().min(2, "Name required").max(100).transform((n) => n.trim()),
  email: z.string().email("Invalid email").transform((e) => e.toLowerCase().trim()),
  subject: z.string().min(1, "Subject required").max(255).transform((s) => s.trim()),
  message: z.string().min(10, "Message too short").max(5000).transform((m) => m.trim()),
});

type ContactInput = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  async function onSubmit(data: ContactInput) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        toast.error("Failed to send message. Please try again.");
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
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="bg-mesh relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative text-center px-4">
          <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
            Get in touch
          </p>
          <h1
            className="text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
          >
            Contact Us
          </h1>
          <p className="text-slate-500 font-light">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </div>
      </div>

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
    </div>
  );
}
