import { z } from "zod";
import { isValidUrl } from "@/lib/utils";

export const websiteSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .transform((n) => n.trim()),
  url: z
    .string()
    .min(1, "URL is required")
    .max(2000, "URL too long")
    .refine(isValidUrl, "Must be a valid HTTP/HTTPS URL"),
  type: z.enum(["distribution", "guest_post", "press_release"]),
  da: z.coerce.number().int().min(0).max(100).default(0),
  pa: z.coerce.number().int().min(0).max(100).default(0),
  spamScore: z.coerce.number().int().min(0).max(100).default(0),
  traffic: z.coerce.number().int().min(0).default(0),
  countryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).default([]),
  subCategoryId: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  submissionUrl: z
    .string()
    .max(2000)
    .refine((v) => !v || isValidUrl(v), "Must be a valid URL")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
  isPinned: z.boolean().default(false),
  isExcluded: z.boolean().default(false),
  tagIds: z.array(z.string()).default([]),
});

export const bulkImportRowSchema = z.object({
  name: z.string().min(1).max(255).transform((n) => n.trim()),
  url: z.string().min(1).refine(isValidUrl, "Invalid URL"),
  type: z.enum(["distribution", "guest_post", "press_release"]),
  da: z.coerce.number().int().min(0).max(100).default(0),
  pa: z.coerce.number().int().min(0).max(100).default(0),
  spam_score: z.coerce.number().int().min(0).max(100).default(0),
  traffic: z.coerce.number().int().min(0).default(0),
  country_slug: z.string().optional().nullable(),
  category_slug: z.string().optional().nullable(),
  tags: z
    .string()
    .optional()
    .nullable()
    .transform((t) =>
      t
        ? t
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : []
    ),
  description: z.string().max(2000).optional().nullable(),
  submission_url: z.string().optional().nullable(),
});

export type WebsiteInput = z.infer<typeof websiteSchema>;
export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;
