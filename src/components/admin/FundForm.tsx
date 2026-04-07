"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fundSchema, type FundInput } from "@/lib/validations/admin/fund";

type FormData = FundInput;

interface Country { id: string; name: string; }
interface Category { id: string; name: string; }
interface Tag { id: string; name: string; }

interface FundFormProps {
  fund: {
    id: string;
    name: string;
    logoUrl: string | null;
    websiteUrl: string;
    countryId: string | null;
    description: string | null;
    investmentStage: string | null;
    ticketSize: string | null;
    isActive: boolean;
    starRating: number | null;
    tagIds: string[];
    categoryIds: string[];
  } | null;
  countries: Country[];
  categories: Category[];
  tags: Tag[];
}

const STAGE_LABELS: Record<string, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  growth: "Growth",
  late_stage: "Late Stage",
};

export function FundForm({ fund, countries, categories, tags }: FundFormProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>(fund?.tagIds ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(fund?.categoryIds ?? []);
  const [logoUrl, setLogoUrl] = useState<string>(fund?.logoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [starRating, setStarRating] = useState<number | null>(fund?.starRating ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedTags(fund?.tagIds ?? []);
    setSelectedCategories(fund?.categoryIds ?? []);
    setLogoUrl(fund?.logoUrl ?? "");
    setStarRating(fund?.starRating ?? null);
  }, [fund]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(fundSchema) as Resolver<FormData>,
    defaultValues: fund
      ? {
          name: fund.name,
          websiteUrl: fund.websiteUrl,
          logoUrl: fund.logoUrl ?? "",
          countryId: fund.countryId ?? "",
          description: fund.description ?? "",
          investmentStage: fund.investmentStage as FormData["investmentStage"],
          ticketSize: fund.ticketSize ?? "",
          isActive: fund.isActive,
          tagIds: fund.tagIds,
        }
      : {
          isActive: true,
          tagIds: [],
        },
  });

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    const res = await fetch("/api/admin/funds/upload-logo", { method: "POST", body: formData });
    setUploading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Logo upload failed");
      return;
    }

    const { url } = await res.json();
    setLogoUrl(url);
    toast.success("Logo uploaded");
  }

  async function onSubmit(data: FormData) {
    const payload = { ...data, logoUrl: logoUrl || null, starRating, tagIds: selectedTags, categoryIds: selectedCategories };
    const url = fund ? `/api/admin/funds/${fund.id}` : "/api/admin/funds";
    const method = fund ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save");
      return;
    }

    toast.success(fund ? "Fund updated" : "Fund created");
    router.push("/admin/funds");
    router.refresh();
  }

  async function handleDelete() {
    if (!fund || !confirm("Delete this fund?")) return;
    const res = await fetch(`/api/admin/funds/${fund.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to delete");
      return;
    }
    toast.success("Fund deleted");
    router.push("/admin/funds");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Fund Name <span className="text-error">*</span></Label>
            <Input id="name" {...register("name")} placeholder="Sequoia Capital" />
            {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="websiteUrl">Website URL <span className="text-error">*</span></Label>
            <Input id="websiteUrl" {...register("websiteUrl")} placeholder="https://sequoiacap.com" />
            {errors.websiteUrl && <p className="text-xs text-error">{errors.websiteUrl.message}</p>}
          </div>

          {/* Logo Upload */}
          <div className="col-span-2 space-y-2">
            <Label>Logo (optional)</Label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <div className="relative w-16 h-16 rounded-lg border border-border-gray overflow-hidden bg-light-gray flex items-center justify-center">
                  <Image src={logoUrl} alt="Logo preview" fill sizes="64px" className="object-contain p-1" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : logoUrl ? "Replace Logo" : "Upload Logo"}
                </Button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="ml-2 text-xs text-error hover:underline"
                  >
                    Remove
                  </button>
                )}
                <p className="text-xs text-medium-gray mt-1">Max 5MB · JPG, PNG, WebP, GIF</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="investmentStage">Investment Stage (optional)</Label>
            <select
              id="investmentStage"
              {...register("investmentStage")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Unknown</option>
              {Object.entries(STAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticketSize">Ticket Size (optional)</Label>
            <Input id="ticketSize" {...register("ticketSize")} placeholder="$500K – $5M" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="countryId">Location (optional)</Label>
            <select
              id="countryId"
              {...register("countryId")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Global / Any</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="description">Short Description</Label>
            <textarea
              id="description"
              {...register("description")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-navy"
              placeholder="Brief description of this fund..."
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Star Rating (optional)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarRating(starRating === star ? null : star)}
                  className={`text-2xl leading-none transition-colors ${
                    starRating !== null && star <= starRating
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-yellow-300"
                  }`}
                >
                  ★
                </button>
              ))}
              {starRating && (
                <button type="button" onClick={() => setStarRating(null)} className="ml-2 text-xs text-medium-gray hover:text-error">
                  Clear
                </button>
              )}
            </div>
            {starRating && starRating >= 4 && (
              <p className="text-xs text-yellow-600">⭐ Gold standard — this fund will always appear in curations for its category</p>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <Label>Categories (select multiple)</Label>
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

        {/* Active toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("isActive")} className="w-4 h-4 rounded" />
            <span className="text-sm text-dark-gray">Active</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-navy hover:bg-blue" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : fund ? "Update Fund" : "Create Fund"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {fund && (
          <Button type="button" variant="destructive" onClick={handleDelete} className="ml-auto">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
