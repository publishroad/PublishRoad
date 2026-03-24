"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const websiteSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  type: z.enum(["distribution", "guest_post", "press_release"]),
  da: z.coerce.number().int().min(0).max(100),
  description: z.string().max(1000).optional(),
  countryId: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean(),
  isPinned: z.boolean(),
  isExcluded: z.boolean(),
  tagIds: z.array(z.string()),
});

type FormData = z.infer<typeof websiteSchema>;

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
    description: string | null;
    countryId: string | null;
    categoryId: string | null;
    isActive: boolean;
    isPinned: boolean;
    isExcluded: boolean;
  } | null;
  countries: Country[];
  categories: Category[];
  tags: Tag[];
}

export function WebsiteForm({ website, countries, categories, tags }: WebsiteFormProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(websiteSchema) as Resolver<FormData>,
    defaultValues: website
      ? {
          name: website.name,
          url: website.url,
          type: website.type as "distribution" | "guest_post" | "press_release",
          da: website.da,
          description: website.description ?? "",
          countryId: website.countryId ?? "",
          categoryId: website.categoryId ?? "",
          isActive: website.isActive,
          isPinned: website.isPinned,
          isExcluded: website.isExcluded,
          tagIds: [],
        }
      : {
          type: "distribution",
          da: 0,
          isActive: true,
          isPinned: false,
          isExcluded: false,
          tagIds: [],
        },
  });

  async function onSubmit(data: FormData) {
    const payload = { ...data, tagIds: selectedTags };
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
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Website deleted");
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
            <Input id="url" {...register("url")} placeholder="https://techcrunch.com" />
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
            <Label htmlFor="countryId">Country (optional)</Label>
            <select id="countryId" {...register("countryId")} className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm">
              <option value="">Global / Any</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Category (optional)</Label>
            <select id="categoryId" {...register("categoryId")} className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm">
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
        <Button type="submit" className="bg-navy hover:bg-blue" disabled={isSubmitting}>
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
