import { z } from "zod";

export function requiredTrimmedString(fieldName: string, options: { min?: number; max: number }) {
  const min = options.min ?? 1;
  const minMessage = min > 1 ? `${fieldName} must be at least ${min} characters` : `${fieldName} is required`;

  return z
    .string()
    .trim()
    .min(min, minMessage)
    .max(options.max, `${fieldName} is too long`);
}

export const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(255, "Email is too long")
  .email("Invalid email address");
