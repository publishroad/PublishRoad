"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { websiteSchema, type WebsiteInput } from "@/lib/validations/admin/website";
type FormData = WebsiteInput;

interface Country { id: string; name: string; }
interface Category { id: string; name: string; }
interface Tag { id: string; name: string; }

interface WebsiteFormProps {
  website: {
    id: string;
    name: string;
    url: string;
    type: string;
    da: number;
    pa: number;
    spamScore: number;
    traffic: number;
    tagIds: string[];
    categoryIds: string[];
    countryIds: string[];
    description: string | null;
    countryId: string | null;
    isActive: boolean;
    isPinned: boolean;
    isExcluded: boolean;
  } | null;
  countries: Country[];
  categories: Category[];
  tags: Tag[];
}

interface DuplicateConflict {
  id: string;
  name: string;
  url: string;
  categories: Array<{ id: string; name: string }>;
}

export function WebsiteForm({ website, countries, categories, tags }: WebsiteFormProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>(website?.tagIds ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(website?.categoryIds ?? []);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(website?.countryIds ?? []);
  const [duplicateDomain, setDuplicateDomain] = useState<string | null>(null);
  const [duplicateConflicts, setDuplicateConflicts] = useState<DuplicateConflict[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    setSelectedTags(website?.tagIds ?? []);
    setSelectedCategories(website?.categoryIds ?? []);
    setSelectedCountries(website?.countryIds ?? []);
  }, [website]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(websiteSchema) as Resolver<FormData>,
    defaultValues: website
      ? {
          name: website.name,
          url: website.url,
          type: website.type as "distribution" | "guest_post" | "press_release",
          da: website.da,
          pa: website.pa,
          spamScore: website.spamScore,
          traffic: website.traffic,
          description: website.description ?? "",
          countryIds: website.countryIds,
          categoryIds: website.categoryIds,
          isActive: website.isActive,
          isPinned: website.isPinned,
          isExcluded: website.isExcluded,
          tagIds: website.tagIds,
        }
      : {
          type: "distribution",
          da: 0,
          pa: 0,
          spamScore: 0,
          traffic: 0,
          isActive: true,
          isPinned: false,
          isExcluded: false,
          tagIds: [],
        },
  });

  const watchedUrl = watch("url");

  async function checkDuplicateUrlNow(rawUrl: string) {
    const urlValue = rawUrl.trim();
    if (!urlValue) {
      setDuplicateDomain(null);
      setDuplicateConflicts([]);
      return;
    }

    try {
      const parsed = new URL(urlValue);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setDuplicateDomain(null);
        setDuplicateConflicts([]);
        return;
      }
    } catch {
      setDuplicateDomain(null);
      setDuplicateConflicts([]);
      return;
    }

    const currentReq = ++requestSeq.current;
    setIsCheckingDuplicate(true);

    const res = await fetch("/api/admin/websites/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: urlValue,
        excludeWebsiteId: website?.id,
      }),
    }).catch(() => null);

    if (currentReq !== requestSeq.current) {
      return;
    }

    setIsCheckingDuplicate(false);

    if (!res?.ok) {
      return;
    }

    const payload = await res.json().catch(() => null);
    setDuplicateDomain(payload?.domain ?? null);
    setDuplicateConflicts(Array.isArray(payload?.conflicts) ? payload.conflicts : []);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkDuplicateUrlNow(watchedUrl ?? "");
    }, 250);

    return () => clearTimeout(timer);
  }, [watchedUrl]);

  async function onSubmit(data: FormData) {
    if (duplicateConflicts.length > 0) {
      toast.error("This domain already exists in the distribution list. Please use a different domain.");
      return;
    }

    const payload = { ...data, tagIds: selectedTags, categoryIds: selectedCategories, countryIds: selectedCountries };
    const url = website
      ? `/api/admin/websites/${website.id}`
      : "/api/admin/websites";
    const method = website ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(err?.conflicts)) {
        setDuplicateDomain(err.duplicateDomain ?? null);
        setDuplicateConflicts(err.conflicts);
      }
      toast.error(err.error ?? "Failed to save");
      return;
    }

    toast.success(website ? "Website updated" : "Website created");
    router.push("/admin/websites");
    router.refresh();
  }

  async function handleDelete() {
    if (!website || !confirm("Delete this website?")) return;
    const res = await fetch(`/api/admin/websites/${website.id}`, { method: "DELETE" });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(payload?.error ?? "Failed to delete");
      return;
    }

    if (payload?.archived) {
      toast.success(payload.message ?? "Website archived successfully");
    } else {
      toast.success("Website deleted");
    }

    router.push("/admin/websites");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="TechCrunch" />
            {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              {...register("url", {
                onBlur: (event) => {
                  void checkDuplicateUrlNow(event.target.value ?? "");
                },
              })}
              placeholder="https://techcrunch.com"
            />
            {isCheckingDuplicate && !errors.url && (
              <p className="text-xs text-medium-gray">Checking for existing domains...</p>
            )}
            {!errors.url && duplicateConflicts.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1">
                <p className="font-medium">
                  This domain already exists{duplicateDomain ? ` (${duplicateDomain})` : ""}.
                </p>
                {duplicateConflicts.map((conflict) => (
                  <div key={conflict.id} className="space-y-1">
                    <p>
                      Existing: <span className="font-medium">{conflict.name}</span> - {conflict.url}
                    </p>
                    <p>
                      Categories: {conflict.categories.length > 0
                        ? conflict.categories.map((category) => category.name).join(", ")
                        : "None assigned"}
                    </p>
                    <Link
                      href={`/admin/websites/${conflict.id}`}
                      className="inline-block text-xs font-medium text-red-800 underline hover:text-red-900"
                    >
                      Open existing record
                    </Link>
                  </div>
                ))}
              </div>
            )}
            {errors.url && <p className="text-xs text-error">{errors.url.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select id="type" {...register("type")} className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm">
              <option value="distribution">Distribution</option>
              <option value="guest_post">Guest Post</option>
              <option value="press_release">Press Release</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="da">Domain Authority (DA)</Label>
            <Input id="da" type="number" {...register("da")} min={0} max={100} />
            {errors.da && <p className="text-xs text-error">{errors.da.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pa">Page Authority (PA)</Label>
            <Input id="pa" type="number" {...register("pa")} min={0} max={100} />
            {errors.pa && <p className="text-xs text-error">{errors.pa.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spamScore">Spam Score</Label>
            <Input id="spamScore" type="number" {...register("spamScore")} min={0} max={100} />
            {errors.spamScore && <p className="text-xs text-error">{errors.spamScore.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="traffic">Traffic</Label>
            <Input id="traffic" type="number" {...register("traffic")} min={0} />
            {errors.traffic && <p className="text-xs text-error">{errors.traffic.message}</p>}
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Countries (optional — leave empty for Global / Any)</Label>
            <div className="flex flex-wrap gap-2">
              {selectedCountries.length === 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full border border-navy bg-navy text-white">
                  🌍 Global / Any
                </span>
              )}
              {countries.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setSelectedCountries((prev) =>
                      prev.includes(c.id)
                        ? prev.filter((id) => id !== c.id)
                        : [...prev, c.id]
                    )
                  }
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedCountries.includes(c.id)
                      ? "bg-navy text-white border-navy"
                      : "border-border-gray text-medium-gray hover:border-navy hover:text-navy"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {selectedCountries.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCountries([])}
                className="text-xs text-medium-gray underline hover:text-navy"
              >
                Clear all (reset to Global)
              </button>
            )}
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Categories (optional, select multiple)</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      prev.includes(cat.id)
                        ? prev.filter((c) => c !== cat.id)
                        : [...prev, cat.id]
                    )
                  }
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedCategories.includes(cat.id)
                      ? "bg-navy text-white border-navy"
                      : "border-border-gray text-medium-gray hover:border-navy hover:text-navy"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register("description")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-navy"
              placeholder="Brief description for AI context..."
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  setSelectedTags((prev) =>
                    prev.includes(tag.id)
                      ? prev.filter((t) => t !== tag.id)
                      : [...prev, tag.id]
                  )
                }
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTags.includes(tag.id)
                    ? "bg-navy text-white border-navy"
                    : "border-border-gray text-medium-gray hover:border-navy hover:text-navy"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Flags */}
        <div className="flex gap-6">
          {[
            { name: "isActive", label: "Active" },
            { name: "isPinned", label: "Pinned (show first)" },
            { name: "isExcluded", label: "Excluded from AI" },
          ].map((flag) => (
            <label key={flag.name} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register(flag.name as keyof FormData)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-dark-gray">{flag.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-navy hover:bg-blue"
          disabled={isSubmitting || duplicateConflicts.length > 0}
        >
          {isSubmitting ? "Saving..." : website ? "Update Website" : "Create Website"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {website && (
          <Button type="button" variant="destructive" onClick={handleDelete} className="ml-auto">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
