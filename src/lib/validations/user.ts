import { z } from "zod";

// Only name is allowed to be updated — no mass assignment
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .transform((n) => n.trim()),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
