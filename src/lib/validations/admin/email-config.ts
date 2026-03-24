import { z } from "zod";

export const emailProviderSchema = z.enum(["resend", "smtp", "sendgrid", "ses"]);

export const emailConfigSchema = z.object({
  provider: emailProviderSchema,
  fromAddress: z.string().min(3).max(255),
  apiKey: z.string().max(2000).optional(),
  host: z.string().max(255).optional().nullable(),
  port: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  username: z.string().max(255).optional().nullable(),
  password: z.string().max(2000).optional(),
  useTls: z.boolean().default(true),
  additionalConfig: z.record(z.string(), z.unknown()).optional(),
});

export type EmailConfigInput = z.infer<typeof emailConfigSchema>;
