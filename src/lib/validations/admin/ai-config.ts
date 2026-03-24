import { z } from "zod";

export const aiConfigSchema = z.object({
  baseUrl: z
    .string()
    .min(1, "Base URL is required")
    .url("Must be a valid URL")
    .max(500),
  apiKey: z
    .string()
    .min(1, "API key is required")
    .max(500),
  modelName: z
    .string()
    .min(1, "Model name is required")
    .max(100)
    .transform((m) => m.trim()),
  maxTokens: z.number().int().min(256).max(32768).default(4096),
  temperature: z.number().min(0).max(2).default(0.3),
});

export type AiConfigInput = z.infer<typeof aiConfigSchema>;
