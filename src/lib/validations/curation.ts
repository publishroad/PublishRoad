import { z } from "zod";
import { isValidUrl } from "@/lib/utils";

export const createCurationSchema = z.object({
  productUrl: z
    .string()
    .min(1, "Product URL is required")
    .max(2000, "URL too long")
    .refine(isValidUrl, "Must be a valid HTTP/HTTPS URL"),
  countryId: z.string().trim().min(1, "Country is required"),
  categoryId: z.string().trim().min(1, "Category is required"),
  keywords: z
    .array(
      z
        .string()
        .min(1, "Keyword cannot be empty")
        .max(50, "Each keyword must be under 50 characters")
        .regex(/^[a-zA-Z0-9-\s]+$/, "Keywords can only contain letters, numbers, hyphens, and spaces")
    )
    .min(1, "At least 1 keyword is required")
    .max(10, "Maximum 10 keywords allowed"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(1000, "Description must be under 1000 characters"),
});

export const updateCurationResultSchema = z.object({
  userStatus: z.enum(["saved", "hidden"]).optional().nullable(),
  userNotes: z
    .string()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .nullable(),
});

// Use input type so react-hook-form generics line up with zodResolver
export type CreateCurationInput = z.input<typeof createCurationSchema>;
export type CreateCurationOutput = z.output<typeof createCurationSchema>;
export type UpdateCurationResultInput = z.infer<typeof updateCurationResultSchema>;
