import { z } from "zod";
import { isValidUrl } from "@/lib/utils";

export const fundSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .transform((n) => n.trim()),
  websiteUrl: z
    .string()
    .min(1, "Website URL is required")
    .max(2000, "URL too long")
    .refine(isValidUrl, "Must be a valid HTTP/HTTPS URL"),
  logoUrl: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).default([]),
  description: z.string().max(2000).optional().nullable(),
  investmentStage: z
    .enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "growth", "late_stage"])
    .optional()
    .nullable(),
  ticketSize: z.string().max(255).optional().nullable(),
  countryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  tagIds: z.array(z.string()).default([]),
});

export type FundInput = z.infer<typeof fundSchema>;
