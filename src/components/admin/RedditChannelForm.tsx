"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { redditChannelSchema, type RedditChannelInput } from "@/lib/validations/admin/reddit-channel";

type FormData = RedditChannelInput;

interface Category { id: string; name: string; }
interface Tag { id: string; name: string; }

interface RedditChannelFormProps {
  channel: {
    id: string;
    name: string;
    url: string;
    weeklyVisitors: number;
    totalMembers: number;
    description: string | null;
    postingDifficulty: string | null;
    isActive: boolean;
    starRating: number | null;
    tagIds: string[];
    categoryIds: string[];
  } | null;
  categories: Category[];
  tags: Tag[];
}

export function RedditChannelForm({ channel, categories, tags }: RedditChannelFormProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>(channel?.tagIds ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(channel?.categoryIds ?? []);
  const [starRating, setStarRating] = useState<number | null>(channel?.starRating ?? null);

  useEffect(() => {
    setSelectedTags(channel?.tagIds ?? []);
    setSelectedCategories(channel?.categoryIds ?? []);
    setStarRating(channel?.starRating ?? null);
  }, [channel]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(redditChannelSchema) as Resolver<FormData>,
    defaultValues: channel
      ? {
          name: channel.name,
          url: channel.url,
          weeklyVisitors: channel.weeklyVisitors,
          totalMembers: channel.totalMembers,
          description: channel.description ?? "",
          postingDifficulty: channel.postingDifficulty as FormData["postingDifficulty"],
          isActive: channel.isActive,
          tagIds: channel.tagIds,
        }
      : {
          weeklyVisitors: 0,
          totalMembers: 0,
          isActive: true,
          tagIds: [],
        },
  });

  async function onSubmit(data: FormData) {
    const payload = { ...data, starRating, tagIds: selectedTags, categoryIds: selectedCategories };
    const url = channel ? `/api/admin/reddit-channels/${channel.id}` : "/api/admin/reddit-channels";
    const method = channel ? "PUT" : "POST";

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

    toast.success(channel ? "Subreddit updated" : "Subreddit created");
    router.push("/admin/reddit-channels");
    router.refresh();
  }

  async function handleDelete() {
    if (!channel || !confirm("Delete this subreddit?")) return;
    const res = await fetch(`/api/admin/reddit-channels/${channel.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to delete");
      return;
    }
    toast.success("Subreddit deleted");
    router.push("/admin/reddit-channels");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Subreddit Name <span className="text-error">*</span></Label>
            <Input id="name" {...register("name")} placeholder="r/startups" />
            {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="url">URL <span className="text-error">*</span></Label>
            <Input id="url" {...register("url")} placeholder="https://reddit.com/r/startups" />
            {errors.url && <p className="text-xs text-error">{errors.url.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="totalMembers">Total Members</Label>
            <Input id="totalMembers" type="number" {...register("totalMembers", { valueAsNumber: true })} min={0} />
            {errors.totalMembers && <p className="text-xs text-error">{errors.totalMembers.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weeklyVisitors">Weekly Visitors</Label>
            <Input id="weeklyVisitors" type="number" {...register("weeklyVisitors", { valueAsNumber: true })} min={0} />
            {errors.weeklyVisitors && <p className="text-xs text-error">{errors.weeklyVisitors.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="postingDifficulty">Posting Difficulty (optional)</Label>
            <select
              id="postingDifficulty"
              {...register("postingDifficulty")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Unknown</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="description">Short Description</Label>
            <textarea
              id="description"
              {...register("description")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-navy"
              placeholder="Brief description of this subreddit..."
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
              <p className="text-xs text-yellow-600">⭐ Gold standard — this subreddit will always appear in curations for its category</p>
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
          {isSubmitting ? "Saving..." : channel ? "Update Subreddit" : "Create Subreddit"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {channel && (
          <Button type="button" variant="destructive" onClick={handleDelete} className="ml-auto">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
