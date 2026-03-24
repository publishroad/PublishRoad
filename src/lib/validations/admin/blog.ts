import { z } from "zod";
import { slugify } from "@/lib/utils";

export const blogPostSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long")
    .transform((t) => t.trim()),
  slug: z
    .string()
    .max(255)
    .optional()
    .transform((s) => (s ? slugify(s) : undefined)),
  excerpt: z.string().max(500).optional().nullable().transform((e) => e?.trim() || null),
  content: z.string().min(1, "Content is required"),
  featuredImage: z.string().url().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  publishDate: z
    .string()
    .optional()
    .nullable()
    .transform((d) => (d ? new Date(d) : null)),
  metaTitle: z.string().max(70).optional().nullable().transform((t) => t?.trim() || null),
  metaDescription: z.string().max(160).optional().nullable().transform((d) => d?.trim() || null),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;
