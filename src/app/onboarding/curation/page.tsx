"use client";

import { Suspense, useState, useEffect, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCurationSchema, type CreateCurationInput } from "@/lib/validations/curation";

interface Country {
  id: string;
  name: string;
  slug: string;
  flagEmoji: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

function OnboardingCurationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hireUs = searchParams.get("hireUs") === "1";
  const hireUsPackage = searchParams.get("hireUsPackage") === "complete" ? "complete" : "starter";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateCurationInput>({
    resolver: zodResolver(createCurationSchema),
    defaultValues: {
      productUrl: "",
      countryId: "",
      categoryId: "",
      keywords: [],
      description: "",
    },
  });

  useEffect(() => {
    fetch("/api/lookup/countries", { cache: "force-cache" })
      .then((r) => r.json())
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch("/api/lookup/categories", { cache: "force-cache" })
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase();
    if (!kw || keywords.includes(kw) || keywords.length >= 10) return;
    const nextKeywords = [...keywords, kw];
    setKeywords(nextKeywords);
    setValue("keywords", nextKeywords, { shouldDirty: true, shouldValidate: true });
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    const nextKeywords = keywords.filter((k) => k !== kw);
    setKeywords(nextKeywords);
    setValue("keywords", nextKeywords, { shouldDirty: true, shouldValidate: true });
  }

  function handleKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  }

  async function onSubmit(data: CreateCurationInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/curations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          keywords,
          ...(hireUs ? { hireUs: true, hireUsPackage } : {}),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          toast.error("No credits remaining. Please upgrade your plan.");
        } else {
          toast.error(result.error ?? "Failed to start curation");
        }
        setIsSubmitting(false);
        return;
      }

      router.push(`/onboarding/processing/${result.curationId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-4 pb-20">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-12 mt-4">
        {["Plan", "Details", "Processing"].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                style={
                  i === 1
                    ? { backgroundColor: "var(--indigo)", color: "#fff" }
                    : i === 0
                    ? { backgroundColor: "rgba(91,88,246,0.2)", color: "var(--indigo)" }
                    : { backgroundColor: "rgba(91,88,246,0.08)", color: "#94a3b8" }
                }
              >
                {i === 0 ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: i === 1 ? "var(--dark)" : i === 0 ? "var(--indigo)" : "#94a3b8" }}
              >
                {step}
              </span>
            </div>
            {i < 2 && <div className="w-8 h-px" style={{ backgroundColor: "#e2e8f0" }} />}
          </div>
        ))}
      </div>

      <div className="text-center mb-10">
        <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
          Step 2
        </p>
        <h1
          className="text-4xl sm:text-5xl font-bold mb-4"
          style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
        >
          Tell us about your product
        </h1>
        <p className="text-slate-500 font-light max-w-md mx-auto">
          We&apos;ll use this to find the best distribution sites for your launch.
        </p>
        {hireUs && (
          <p className="text-xs text-indigo-600 mt-3 font-medium">
            Hire Us is active. Your request will appear in Dashboard Hire Us after you submit this curation.
          </p>
        )}
      </div>

      <div className="max-w-xl mx-auto">
        <div
          className="bg-white rounded-[2rem] p-8"
          style={{
            boxShadow: "0 8px 40px rgba(91,88,246,0.08)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Product URL */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-medium">
                Product URL <span className="text-error">*</span>
              </Label>
              <Input
                type="url"
                placeholder="https://yourproduct.com"
                className="rounded-xl border-slate-200 h-11"
                {...register("productUrl")}
              />
              {errors.productUrl && (
                <p className="text-xs text-error">{errors.productUrl.message}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-medium">
                Target Country <span className="text-error">*</span>
              </Label>
              <select
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                {...register("countryId")}
              >
                <option value="">Select country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flagEmoji} {c.name}
                  </option>
                ))}
              </select>
              {errors.countryId && (
                <p className="text-xs text-error">{errors.countryId.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-medium">
                Category <span className="text-error">*</span>
              </Label>
              <select
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                {...register("categoryId")}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-error">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Keywords */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-medium">
                Keywords <span className="text-error">*</span>
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  (up to 10, press Enter or comma to add)
                </span>
              </Label>
              <div
                className="min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition-all"
              >
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: "var(--indigo-light)", color: "var(--indigo)" }}
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {keywords.length < 10 && (
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    onBlur={addKeyword}
                    placeholder={keywords.length === 0 ? "saas, productivity, b2b..." : ""}
                    className="flex-1 min-w-[120px] border-none outline-none text-sm text-slate-700 bg-transparent placeholder:text-slate-400"
                  />
                )}
              </div>
              <p className="text-xs text-slate-400 font-light">
                {keywords.length}/10 keywords added
              </p>
              {errors.keywords && (
                <p className="text-xs text-error">{errors.keywords.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-medium">
                Product Description <span className="text-error">*</span>
              </Label>
              <textarea
                rows={4}
                placeholder="Briefly describe your product, who it's for, and what problem it solves..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none transition-all"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-error">{errors.description.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "block", width: "100%", borderRadius: "999px",
                padding: "13px 24px", background: "#5B58F6", color: "#ffffff",
                fontWeight: 600, fontSize: "0.95rem", border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 0 24px rgba(91,88,246,0.35)", transition: "all 0.2s",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Starting curation..." : "Generate My Distribution Plan →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingCurationPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingCurationPageContent />
    </Suspense>
  );
}
