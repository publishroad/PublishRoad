import { z } from "zod";

const socialPlatformSchema = z.enum([
  "x",
  "linkedin",
  "instagram",
  "producthunt",
  "youtube",
  "tiktok",
  "facebook",
  "github",
  "discord",
  "reddit",
  "website",
]);

export const socialLinkInputSchema = z.object({
  id: z.string().trim().min(1).max(80),
  platform: socialPlatformSchema,
  label: z.string().trim().min(1).max(60),
  href: z.string().trim().max(500).url().refine((value) => value.startsWith("https://"), {
    message: "URL must start with https://",
  }),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(1000),
});

export const socialLinksPayloadSchema = z.object({
  links: z.array(socialLinkInputSchema).max(20),
});

export type SocialLinkInput = z.infer<typeof socialLinkInputSchema>;
export type SocialLinksPayload = z.infer<typeof socialLinksPayloadSchema>;
