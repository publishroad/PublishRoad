import { z } from "zod";

export const paymentProviderSchema = z.enum(["stripe", "razorpay", "paypal"]);

export const paymentConfigSchema = z.object({
  provider: paymentProviderSchema,
  publicKey: z.string().max(500).optional().nullable(),
  secretKey: z.string().max(1000).optional(),
  webhookSecret: z.string().max(1000).optional(),
  additionalConfig: z.record(z.string(), z.unknown()).optional(),
});

export type PaymentConfigInput = z.infer<typeof paymentConfigSchema>;
