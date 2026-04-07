import { z } from "zod";
import { isValidUrl } from "@/lib/utils";

export const redditChannelSchema = z.object({
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
  weeklyVisitors: z.coerce.number().int().min(0).default(0),
  totalMembers: z.coerce.number().int().min(0).default(0),
  categoryIds: z.array(z.string()).default([]),
  description: z.string().max(2000).optional().nullable(),
  postingDifficulty: z.enum(["easy", "medium", "hard"]).optional().nullable(),
  isActive: z.boolean().default(true),
  starRating: z.coerce.number().int().min(1).max(5).nullable().optional().default(null),
  tagIds: z.array(z.string()).default([]),
});

export type RedditChannelInput = z.infer<typeof redditChannelSchema>;
