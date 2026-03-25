"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { influencerSchema, type InfluencerInput } from "@/lib/validations/admin/influencer";

type FormData = InfluencerInput;

interface Country { id: string; name: string; }
interface Category { id: string; name: string; }
interface Tag { id: string; name: string; }

interface InfluencerFormProps {
  influencer: {
    id: string;
    name: string;
    platform: string;
    followersCount: number;
    countryId: string | null;
    description: string | null;
    profileLink: string;
    email: string | null;
    isActive: boolean;
    tagIds: string[];
    categoryIds: string[];
  } | null;
  countries: Country[];
  categories: Category[];
  tags: Tag[];
}

export function InfluencerForm({ influencer, countries, categories, tags }: InfluencerFormProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>(influencer?.tagIds ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(influencer?.categoryIds ?? []);

  useEffect(() => {
    setSelectedTags(influencer?.tagIds ?? []);
    setSelectedCategories(influencer?.categoryIds ?? []);
  }, [influencer]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(influencerSchema) as Resolver<FormData>,
    defaultValues: influencer
      ? {
          name: influencer.name,
          platform: influencer.platform as FormData["platform"],
          followersCount: influencer.followersCount,
          countryId: influencer.countryId ?? "",
          description: influencer.description ?? "",
          profileLink: influencer.profileLink,
          email: influencer.email ?? "",
          isActive: influencer.isActive,
          tagIds: influencer.tagIds,
        }
      : {
          platform: "instagram",
          followersCount: 0,
          isActive: true,
          tagIds: [],
        },
  });

  async function onSubmit(data: FormData) {
    const payload = { ...data, tagIds: selectedTags, categoryIds: selectedCategories };
    const url = influencer ? `/api/admin/social/${influencer.id}` : "/api/admin/social";
    const method = influencer ? "PUT" : "POST";

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

    toast.success(influencer ? "Influencer updated" : "Influencer created");
    router.push("/admin/social");
    router.refresh();
  }

  async function handleDelete() {
    if (!influencer || !confirm("Delete this influencer?")) return;
    const res = await fetch(`/api/admin/social/${influencer.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to delete");
      return;
    }
    toast.success("Influencer deleted");
    router.push("/admin/social");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Name <span className="text-error">*</span></Label>
            <Input id="name" {...register("name")} placeholder="John Doe" />
            {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform <span className="text-error">*</span></Label>
            <select
              id="platform"
              {...register("platform")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="twitter">Twitter (X)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="followersCount">Followers Count</Label>
            <Input id="followersCount" type="number" {...register("followersCount")} min={0} />
            {errors.followersCount && <p className="text-xs text-error">{errors.followersCount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="countryId">Country (optional)</Label>
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
            <Label htmlFor="profileLink">Profile Link <span className="text-error">*</span></Label>
            <Input id="profileLink" {...register("profileLink")} placeholder="https://instagram.com/johndoe" />
            {errors.profileLink && <p className="text-xs text-error">{errors.profileLink.message}</p>}
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" {...register("email")} placeholder="contact@example.com" />
            {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="description">Short Description</Label>
            <textarea
              id="description"
              {...register("description")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-navy"
              placeholder="Brief description of this influencer..."
            />
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
          {isSubmitting ? "Saving..." : influencer ? "Update Influencer" : "Create Influencer"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {influencer && (
          <Button type="button" variant="destructive" onClick={handleDelete} className="ml-auto">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
