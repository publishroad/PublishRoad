"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { uploadBlogImage } from "@/lib/blog-image-upload";

// Dynamically import TipTap to avoid SSR issues
const TipTapEditor = dynamic(() => import("./TipTapEditor"), { ssr: false });

const blogSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  excerpt: z.string().max(500).optional(),
  featuredImage: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value) || /^(localhost|127\.0\.0\.1)(:\d+)?\//i.test(value),
      "Please enter a valid image URL or /uploads path"
    ),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  status: z.enum(["draft", "published"]),
  publishDate: z.string().optional(),
});

type FormData = z.infer<typeof blogSchema>;

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  content: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
  publishDate: Date | null;
}

export function BlogEditor({ post }: { post: Post | null }) {
  const router = useRouter();
  const [content, setContent] = useState(post?.content ?? "");
  const [isUploadingFeaturedImage, setIsUploadingFeaturedImage] = useState(false);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const slugManuallyEditedRef = useRef(Boolean(post));

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: post
      ? {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          featuredImage: post.featuredImage ?? "",
          metaTitle: post.metaTitle ?? "",
          metaDescription: post.metaDescription ?? "",
          status: post.status as "draft" | "published",
          publishDate: post.publishDate
            ? new Date(post.publishDate).toISOString().split("T")[0]
            : "",
        }
      : { status: "draft", featuredImage: "" },
  });

  const title = watch("title");
  const titleField = register("title");
  const slugField = register("slug");

  function buildSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 200);
  }

  // Auto-generate slug from title until the slug is edited manually.
  function handleTitleBlur() {
    if (post || slugManuallyEditedRef.current) {
      return;
    }

    setValue("slug", buildSlug(title), { shouldDirty: true, shouldValidate: true });
  }

  async function handleFeaturedImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingFeaturedImage(true);
    try {
      const imageUrl = await uploadBlogImage(file);
      setValue("featuredImage", imageUrl, { shouldDirty: true, shouldValidate: true });
      toast.success("Header image uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setIsUploadingFeaturedImage(false);
    }
  }

  async function onSubmit(data: FormData) {
    const url = post ? `/api/admin/blog/${post.id}` : "/api/admin/blog";
    const method = post ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, slug: data.slug || buildSlug(data.title), content }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save");
      return;
    }

    toast.success(post ? "Post updated" : "Post created");
    router.push("/admin/blog");
    router.refresh();
  }

  async function handleDelete() {
    if (!post || !confirm("Delete this article?")) return;

    const res = await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to delete");
      return;
    }

    toast.success("Article deleted");
    router.push("/admin/blog");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...titleField}
            onBlur={(event) => {
              titleField.onBlur(event);
              handleTitleBlur();
            }}
            placeholder="Post title"
          />
          {errors.title && <p className="text-xs text-error">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            {...slugField}
            onChange={(event) => {
              slugManuallyEditedRef.current = true;
              slugField.onChange(event);
            }}
            placeholder="post-slug"
          />
          <p className="text-xs text-medium-gray">
            Once the article is published, the slug stays the same unless you edit it manually.
          </p>
          {errors.slug && <p className="text-xs text-error">{errors.slug.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="excerpt">Excerpt</Label>
          <textarea
            id="excerpt"
            {...register("excerpt")}
            className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-navy"
            placeholder="Short summary for listing pages..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="featuredImage">Header Image URL</Label>
          <div className="flex gap-2">
            <Input
              id="featuredImage"
              {...register("featuredImage")}
              placeholder="https://example.com/header-image.jpg"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => featuredImageInputRef.current?.click()}
              disabled={isUploadingFeaturedImage}
            >
              {isUploadingFeaturedImage ? "Uploading..." : "Upload"}
            </Button>
          </div>
          <input
            ref={featuredImageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="hidden"
            onChange={handleFeaturedImageUpload}
          />
          {errors.featuredImage && <p className="text-xs text-error">{errors.featuredImage.message}</p>}
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white rounded-xl border border-border-gray overflow-hidden">
        <div className="bg-ice-blue border-b border-border-gray px-4 py-2">
          <p className="text-sm font-medium text-navy">Content</p>
        </div>
        <div className="p-4">
          <TipTapEditor content={content} onChange={setContent} />
        </div>
      </div>

      {/* SEO */}
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <h2 className="font-semibold text-navy text-sm">SEO</h2>
        <div className="space-y-1.5">
          <Label htmlFor="metaTitle">Meta Title (max 70 chars)</Label>
          <Input id="metaTitle" {...register("metaTitle")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metaDescription">Meta Description (max 160 chars)</Label>
          <textarea
            id="metaDescription"
            {...register("metaDescription")}
            className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:border-navy"
          />
        </div>
      </div>

      {/* Publish settings */}
      <div className="bg-white rounded-xl border border-border-gray p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register("status")}
              className="w-full border border-border-gray rounded-lg px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publishDate">Publish Date</Label>
            <Input id="publishDate" type="date" {...register("publishDate")} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="bg-navy hover:bg-blue" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : post ? "Update Post" : "Create Post"}
        </Button>
        {post?.status === "published" && (
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            View Post ↗
          </Link>
        )}
        {post && (
          <Button type="button" variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            Delete Post
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
