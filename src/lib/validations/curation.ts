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
        .trim()
        .min(1, "Keyword cannot be empty")
        .max(50, "Each keyword must be under 50 characters")
        .regex(/^[a-zA-Z0-9-\s]+$/, "Keywords can only contain letters, numbers, hyphens, and spaces")
    )
    .max(10, "Maximum 10 keywords allowed")
    .optional()
    .default([]),
  problemStatement: z
    .string()
    .trim()
    .min(1, "Problem statement is required")
    .max(1000, "Problem statement must be under 1000 characters"),
  solutionStatement: z
    .string()
    .trim()
    .min(1, "Solution statement is required")
    .max(1000, "Solution statement must be under 1000 characters"),
  hireUs: z.boolean().optional(),
  hireUsPackage: z.enum(["starter", "complete"]).optional(),
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
