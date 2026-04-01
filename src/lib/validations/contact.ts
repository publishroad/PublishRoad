import { z } from "zod";
import { normalizedEmailSchema, requiredTrimmedString } from "@/lib/validations/common";

export const contactSchema = z.object({
  name: requiredTrimmedString("Name", { min: 2, max: 100 }),
  email: normalizedEmailSchema,
  subject: requiredTrimmedString("Subject", { min: 1, max: 255 }),
  message: requiredTrimmedString("Message", { min: 10, max: 5000 }),
});

export type ContactInput = z.infer<typeof contactSchema>;
