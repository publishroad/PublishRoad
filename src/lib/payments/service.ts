import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe";
import { decryptField } from "@/lib/server-utils";
import { getPayPalAccessToken, createPayPalOrder } from "@/lib/payments/paypal";

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

export async function getPaymentConfigRow(): Promise<PaymentConfigRow | null> {
  // Only return the row that is explicitly activated — no fallback.
  // If no gateway is active, payments are disabled.
  const rows = await db.$queryRaw<PaymentConfigRow[]>`
    SELECT provider, secret_key, webhook_secret
    FROM payment_gateway_config
    WHERE is_active = true
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
    throw new PaymentConfigurationError(
      "No payment gateway is active. Go to Admin → Settings → Payment and activate one."
    );
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

async function getPayPalCredentials(): Promise<{ clientId: string; secret: string; mode: string }> {
  // Query the paypal row directly using its provider name as the ID
  const rows = await db.$queryRaw<Array<{
    secret_key: string | null;
    public_key: string | null;
    is_active: boolean;
    additional_config: unknown;
  }>>`
    SELECT secret_key, public_key, is_active, additional_config
    FROM payment_gateway_config
    WHERE id = 'paypal'
    LIMIT 1
  `;
  const row = rows[0];

  if (!row) {
    throw new PaymentConfigurationError("PayPal credentials are not configured in Payment Settings.");
  }
  if (!row.is_active) {
    throw new PaymentConfigurationError("PayPal is not the active payment gateway. Activate it in Admin → Settings → Payment.");
  }

  const clientId = row.public_key?.trim();
  if (!clientId) {
    throw new PaymentConfigurationError("PayPal Client ID (Public Key) is not configured in Payment Settings.");
  }

  const secret = getDecryptedValueOrThrow(
    row.secret_key,
    "PayPal Secret Key is not configured in Payment Settings.",
    "PayPal Secret Key in Payment Settings is invalid."
  );

  const additionalConfig = (typeof row.additional_config === "object" && row.additional_config !== null)
    ? row.additional_config as Record<string, unknown>
    : {};
  const mode = typeof additionalConfig.mode === "string" ? additionalConfig.mode : "live";

  return { clientId, secret, mode };
}

export async function getActivePaymentProvider(): Promise<ActivePaymentProvider | null> {
  const config = await getPaymentConfigRow();
  return config?.provider ?? null;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const config = await getPaymentConfigRow();

  // No active gateway or active gateway is not Stripe
  if (!config || config.provider !== "stripe") {
    return null;
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
  const config = await getPaymentConfigRow();

  if (!config) {
    throw new PaymentConfigurationError(
      "No payment gateway is active. Go to Admin → Settings → Payment and activate one."
    );
  }

  const provider = config.provider;

  // ── Stripe ────────────────────────────────────────────────────────────────
  if (provider === "stripe") {
    const stripeSecretKey = await getStripeSecretKeyForRuntime();
    return createCheckoutSession({ ...args, stripeSecretKey });
  }

  // ── PayPal ────────────────────────────────────────────────────────────────
  if (provider === "paypal") {
    const { clientId, secret, mode } = await getPayPalCredentials();

    const plan = await db.planConfig.findUnique({
      where: { id: args.planId },
      select: { priceCents: true, name: true },
    });
    if (!plan) throw new PaymentConfigurationError("Plan not found.");

    const amountUsd = (plan.priceCents / 100).toFixed(2);
    const accessToken = await getPayPalAccessToken(clientId, secret, mode);

    // Capture URL — PayPal redirects here after the user approves payment.
    // We store planId + userId in Redis (keyed by orderId) so the capture
    // endpoint doesn't need to trust user-supplied URL parameters.
    const captureBase = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paypal-capture`;

    const { orderId, approveUrl } = await createPayPalOrder({
      accessToken,
      mode,
      amountUsd,
      planName: plan.name,
      returnUrl: captureBase,
      cancelUrl: args.cancelUrl,
    });

    // Store { planId, userId } for 30 minutes — long enough for any checkout
    await redis.set(
      `paypal:order:${orderId}`,
      JSON.stringify({ planId: args.planId, userId: args.userId }),
      { ex: 1800 }
    );

    return approveUrl;
  }

  throw new UnsupportedPaymentProviderError(provider);
}

export async function createPortalForActiveProvider(args: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripeSecretKey = await getStripeSecretKeyForRuntime();

  return createPortalSession(args.stripeCustomerId, args.returnUrl, stripeSecretKey);
}
