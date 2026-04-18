"use client";
// Static form component — no real-time rendering needed

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { createCurationSchema, type CreateCurationInput } from "@/lib/validations/curation";

type CountryOption = {
  id: string;
  name: string;
  flagEmoji?: string;
};

type CategoryOption = {
  id: string;
  name: string;
};

type UserProfile = {
  creditsRemaining?: number;
  plan?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

const SELECT_COUNTRY_VALUE = "__select_country__";
const SELECT_CATEGORY_VALUE = "__select_category__";
const WORLDWIDE_COUNTRY_VALUE = "worldwide";

async function fetchCountries() {
  const res = await fetch("/api/lookup/countries", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as CountryOption[];
}

async function fetchCategories() {
  const res = await fetch("/api/lookup/categories", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as CategoryOption[];
}

async function fetchUserProfile() {
  const res = await fetch("/api/user/profile", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as UserProfile;
}

export default function NewCurationPage() {
  const router = useRouter();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-profile", "new-curation"],
    queryFn: fetchUserProfile,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const creditsRemaining = userProfile?.creditsRemaining;
  const canCreateCuration =
    creditsRemaining === undefined ? true : creditsRemaining === -1 || creditsRemaining > 0;

  const form = useForm<CreateCurationInput>({
    resolver: zodResolver(createCurationSchema),
    defaultValues: {
      productUrl: "",
      countryId: undefined,
      categoryId: undefined,
      keywords: [],
      problemStatement: "",
      solutionStatement: "",
    },
  });

  const keywordError = form.formState.errors.keywords?.message;

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase();
    if (!kw || keywords.includes(kw) || keywords.length >= 10) return;
    const newKeywords = [...keywords, kw];
    setKeywords(newKeywords);
    form.setValue("keywords", newKeywords, { shouldDirty: true, shouldValidate: true });
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    const newKeywords = keywords.filter((k) => k !== kw);
    setKeywords(newKeywords);
    form.setValue("keywords", newKeywords, { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(data: CreateCurationInput) {
    if (!canCreateCuration) {
      toast.error("No credits remaining. Please upgrade your plan.");
      router.push("/dashboard/billing");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/curations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, keywords }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error("No credits remaining. Please upgrade your plan.");
          router.push("/dashboard/billing");
          return;
        }
        toast.error(result.error ?? "Failed to create curation");
        return;
      }

      if (typeof result.curationId !== "string" || result.curationId.length === 0) {
        toast.error("Curation started but no curation ID was returned. Please try again.");
        return;
      }

      if (result.siteValidation?.warning) {
        toast(result.siteValidation.warning);
      } else {
        toast.success("Curation started! We'll notify you when it's ready.");
      }

      router.push(`/onboarding/processing/${result.curationId}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isProfileLoading) {
    return (
      <>
        <AppHeader title="New Curation" />
        <div className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading your account details...
          </div>
        </div>
      </>
    );
  }

  if (!canCreateCuration) {
    return (
      <>
        <AppHeader title="New Curation" />
        <div className="flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">No credits remaining</p>
            <p className="mt-2 text-sm text-slate-600">
              Your account is currently on the {userProfile?.plan?.name ?? "Free"} plan with 0 available credits.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/billing")}
              className="mt-5 h-10 rounded-xl bg-[#465FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3d55e8]"
            >
              Go to Billing
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="New Curation" />
      <div className="flex-1 px-4 py-6 md:px-6">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-[#E4E9FF] bg-gradient-to-b from-[#F8FAFF] to-[#EEF2FF] p-6">
            <p className="mb-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#465FFF]">
              New Campaign
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Create a Distribution Plan</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Pick your market, category, and intent signals. We use this to score websites that are most likely to
              convert for your launch.
            </p>

            <div className="mt-6 space-y-3 rounded-2xl bg-white/80 p-4">
              <p className="text-sm font-semibold text-slate-900">What improves result quality</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><span className="font-medium text-slate-800">Problem statement</span> — describe who suffers, what pain they feel, and when. The more specific, the better your match.</li>
                <li><span className="font-medium text-slate-800">Solution statement</span> — explain what your product does, how it works, and what makes it different.</li>
                <li><span className="font-medium text-slate-800">Country + category</span> — narrows results to channels where your audience actually is.</li>
                <li><span className="font-medium text-slate-800">Keywords</span> — optional extra hints (e.g. "no-code", "b2b", "api").</li>
              </ul>
            </div>
          </aside>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="productUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Product URL <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourproduct.com" type="url" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Category <span className="text-red-500">*</span>
                        </FormLabel>
                        {(() => {
                          const selectedCategory = categories.find((category) => category.id === field.value);
                          const categoryLabel = selectedCategory?.name ?? "Select category";

                          return (
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value === SELECT_CATEGORY_VALUE ? undefined : value);
                          }}
                          value={field.value ?? SELECT_CATEGORY_VALUE}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <span
                                className={field.value ? "line-clamp-1 text-slate-900" : "line-clamp-1 text-muted-foreground"}
                              >
                                {categoryLabel}
                              </span>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={SELECT_CATEGORY_VALUE}>Select category</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                          );
                        })()}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="countryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Press Release Country <span className="text-red-500">*</span>
                        </FormLabel>
                        {(() => {
                          const selectedCountry = countries.find((country) => country.id === field.value);
                          const countryLabel = field.value === WORLDWIDE_COUNTRY_VALUE
                            ? "Worldwide"
                            : selectedCountry
                            ? `${selectedCountry.flagEmoji ? `${selectedCountry.flagEmoji} ` : ""}${selectedCountry.name}`
                            : "Select country";

                          return (
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value === SELECT_COUNTRY_VALUE ? undefined : value);
                          }}
                          value={field.value ?? SELECT_COUNTRY_VALUE}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <span
                                className={field.value ? "line-clamp-1 text-slate-900" : "line-clamp-1 text-muted-foreground"}
                              >
                                {countryLabel}
                              </span>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={SELECT_COUNTRY_VALUE}>Select country</SelectItem>
                            <SelectItem value={WORLDWIDE_COUNTRY_VALUE}>Worldwide</SelectItem>
                            {countries.map((country) => (
                              <SelectItem key={country.id} value={country.id}>
                                {country.flagEmoji} {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                          );
                        })()}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormLabel>
                    Keywords <span className="text-slate-400">(optional)</span>
                  </FormLabel>
                  <div className="mb-2 flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      placeholder="Add a keyword"
                      maxLength={50}
                      disabled={keywords.length >= 10}
                    />
                    <button
                      type="button"
                      onClick={addKeyword}
                      disabled={!keywordInput.trim() || keywords.length >= 10}
                      className="h-10 whitespace-nowrap rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>

                  {keywords.length > 0 && (
                    <div className="mb-1 flex flex-wrap gap-2">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-3 py-1 text-sm font-medium text-[#465FFF]"
                        >
                          {kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(kw)}
                            className="ml-1 leading-none text-[#465FFF]/50 hover:text-red-500"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500">{keywords.length}/10 keywords</p>
                  {keywordError && <p className="mt-1 text-sm font-medium text-destructive">{keywordError}</p>}
                </div>

                <FormField
                  control={form.control}
                  name="problemStatement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Problem Statement <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe Problem your solving"
                          className="min-h-[130px] resize-y"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="solutionStatement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Solution Statement <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your solution fully, What it does, how it works, and who it's built for"
                          className="min-h-[130px] resize-y"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-xl bg-[#465FFF] text-sm font-semibold text-white transition-colors hover:bg-[#3d55e8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Creating curation..." : "Generate Distribution Plan"}
                  </button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
