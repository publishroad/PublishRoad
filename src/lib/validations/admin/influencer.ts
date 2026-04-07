import { z } from "zod";
import { isValidUrl } from "@/lib/utils";

export const influencerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .transform((n) => n.trim()),
  platform: z.enum(["tiktok", "instagram", "youtube", "twitter"]),
  followersCount: z.coerce.number().int().min(0).default(0),
  categoryIds: z.array(z.string()).default([]),
  countryId: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  profileLink: z
    .string()
    .min(1, "Profile link is required")
    .max(2000, "URL too long")
    .refine(isValidUrl, "Must be a valid HTTP/HTTPS URL"),
  email: z.string().email("Must be a valid email").optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  starRating: z.coerce.number().int().min(1).max(5).nullable().optional().default(null),
  tagIds: z.array(z.string()).default([]),
});

export type InfluencerInput = z.infer<typeof influencerSchema>;
