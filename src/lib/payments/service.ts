import { db } from "@/lib/db";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe";
import { decryptField } from "@/lib/server-utils";

export type ActivePaymentProvider = "stripe" | "razorpay" | "paypal";

export class UnsupportedPaymentProviderError extends Error {
  constructor(public provider: ActivePaymentProvider) {
    super(`Configured payment provider (${provider}) is not yet enabled for this flow.`);
    this.name = "UnsupportedPaymentProviderError";
  }
}

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

type PaymentConfigRow = {
  provider: ActivePaymentProvider;
  secret_key: string | null;
  webhook_secret: string | null;
};

async function getPaymentConfigRow(): Promise<PaymentConfigRow | null> {
  const rows = await db.$queryRaw<PaymentConfigRow[]>`
    SELECT provider, secret_key, webhook_secret
    FROM payment_gateway_config
    WHERE id = 'default'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function getDecryptedValueOrThrow(value: string | null, missingMessage: string, invalidMessage: string): string {
  if (!value) {
    throw new PaymentConfigurationError(missingMessage);
  }

  try {
    const decrypted = decryptField(value);
    if (!decrypted.trim()) {
      throw new Error("empty");
    }
    return decrypted;
  } catch {
    throw new PaymentConfigurationError(invalidMessage);
  }
}

async function getStripeSecretKeyForRuntime(): Promise<string> {
  const config = await getPaymentConfigRow();

  if (!config) {
    const envKey = process.env.STRIPE_SECRET_KEY;
    if (!envKey?.trim()) {
      throw new PaymentConfigurationError("Stripe secret key is missing. Add it in Payment Settings or environment.");
    }
    return envKey.trim();
  }

  if (config.provider !== "stripe") {
    throw new UnsupportedPaymentProviderError(config.provider);
  }

  return getDecryptedValueOrThrow(
    config.secret_key,
    "Stripe secret key is not configured in Payment Settings.",
    "Stripe secret key in Payment Settings is invalid."
  );
}

export async function getActivePaymentProvider(): Promise<ActivePaymentProvider> {
  const config = await getPaymentConfigRow();
  return config?.provider ?? "stripe";
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const config = await getPaymentConfigRow();

  if (config?.provider && config.provider !== "stripe") {
    return null;
  }

  if (!config) {
    return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? null;
  }

  return getDecryptedValueOrThrow(
    config.webhook_secret,
    "Stripe webhook secret is not configured in Payment Settings.",
    "Stripe webhook secret in Payment Settings is invalid."
  );
}

export async function createCheckoutForActiveProvider(args: {
  userId: string;
  planId: string;
  stripeCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripeSecretKey = await getStripeSecretKeyForRuntime();

  return createCheckoutSession({ ...args, stripeSecretKey });
}

export async function createPortalForActiveProvider(args: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripeSecretKey = await getStripeSecretKeyForRuntime();

  return createPortalSession(args.stripeCustomerId, args.returnUrl, stripeSecretKey);
}
