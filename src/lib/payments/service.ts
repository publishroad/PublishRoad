import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { invalidateUserProfile } from "@/lib/cache";
import { attachHireUsCuration, finalizeHireUsPurchase, parseHireUsPackageSlug } from "@/lib/hire-us";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe";
import { decryptField } from "@/lib/server-utils";
import { createAffiliateCommissionForPayment } from "@/lib/referrals/commissions";
import { getPayPalAccessToken, createPayPalOrder } from "@/lib/payments/paypal";
import { createRazorpayOrder } from "@/lib/payments/razorpay";

export type ActivePaymentProvider = "stripe" | "razorpay" | "paypal";

const PAYMENT_PROVIDER_ORDER: ActivePaymentProvider[] = ["stripe", "paypal", "razorpay"];

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

type GatewayConfigRow = {
  is_active: boolean;
  public_key: string | null;
  secret_key: string | null;
  webhook_secret: string | null;
  additional_config: unknown;
};

export async function getPaymentConfigRow(): Promise<PaymentConfigRow | null> {
  const rows = await db.$queryRaw<PaymentConfigRow[]>`
    SELECT provider, secret_key, webhook_secret
    FROM payment_gateway_config
    WHERE is_active = true
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getActivePaymentProvidersList(): Promise<ActivePaymentProvider[]> {
  const rows = await db.$queryRaw<Array<{ provider: ActivePaymentProvider }>>`
    SELECT provider FROM payment_gateway_config WHERE is_active = true
  `;

  const uniqueProviders = Array.from(new Set(rows.map((r) => r.provider)));
  return uniqueProviders.sort(
    (a, b) => PAYMENT_PROVIDER_ORDER.indexOf(a) - PAYMENT_PROVIDER_ORDER.indexOf(b)
  );
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

async function getGatewayConfigById(provider: ActivePaymentProvider): Promise<GatewayConfigRow | null> {
  const rows = await db.$queryRaw<GatewayConfigRow[]>`
    SELECT is_active, public_key, secret_key, webhook_secret, additional_config
    FROM payment_gateway_config
    WHERE id = ${provider}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getStripeSecretKey(options?: { requireActive?: boolean }): Promise<string> {
  const requireActive = options?.requireActive ?? true;
  const config = await getGatewayConfigById("stripe");
  if (!config) {
    throw new PaymentConfigurationError("Stripe credentials are not configured in Payment Settings.");
  }
  if (requireActive && !config.is_active) {
    throw new PaymentConfigurationError("Stripe is not active. Go to Admin → Settings → Payment and activate it.");
  }
  return getDecryptedValueOrThrow(
    config.secret_key,
    "Stripe secret key is not configured in Payment Settings.",
    "Stripe secret key in Payment Settings is invalid."
  );
}

async function getPayPalCredentials(): Promise<{ clientId: string; secret: string; mode: string }> {
  const row = await getGatewayConfigById("paypal");

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

export async function getPayPalRuntimeCredentials(): Promise<{ clientId: string; secret: string; mode: string }> {
  return getPayPalCredentials();
}

export async function getActivePaymentProvider(): Promise<ActivePaymentProvider | null> {
  const config = await getPaymentConfigRow();
  return config?.provider ?? null;
}

export async function isPaymentProviderActive(provider: ActivePaymentProvider): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ is_active: boolean }>>`
    SELECT is_active
    FROM payment_gateway_config
    WHERE id = ${provider}
    LIMIT 1
  `;
  return !!rows[0]?.is_active;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const config = await getGatewayConfigById("stripe");
  if (!config) return null;

  return getDecryptedValueOrThrow(
    config.webhook_secret,
    "Stripe webhook secret is not configured in Payment Settings.",
    "Stripe webhook secret in Payment Settings is invalid."
  );
}

export type CheckoutResult =
  | { type: "redirect"; url: string }
  | { type: "razorpay"; orderId: string; amount: number; currency: string; keyId: string; planName: string; successUrl: string; cancelUrl: string };

export async function applyPlanPaymentAndCredits(args: {
  userId: string;
  planId: string;
  providerPaymentId?: string;
  amountCents: number;
  currency: string;
  creditsAmount: number;
  creditStrategy?: "add" | "replace";
  paymentType?: "plan" | "hire_us";
}): Promise<{ processedAlready: boolean; paymentId: string | null }> {
  let processedAlready = false;
  let createdPaymentId: string | null = null;
  const creditStrategy = args.creditStrategy ?? "add";
  const paymentType = args.paymentType ?? "plan";

  await db.$transaction(async (tx) => {
    if (args.providerPaymentId) {
      const existing = await tx.payment.findFirst({
        where: { providerPaymentId: args.providerPaymentId },
        select: { id: true },
      });
      if (existing) {
        processedAlready = true;
        return;
      }
    }

    const payment = await tx.payment.create({
      data: {
        userId: args.userId,
        planId: args.planId,
        providerPaymentId: args.providerPaymentId,
        paymentType,
        amountCents: args.amountCents,
        currency: args.currency,
        status: "completed",
      },
    });
    createdPaymentId = payment.id;

    if (paymentType === "plan") {
      const user = await tx.user.findUnique({
        where: { id: args.userId },
        select: { creditsRemaining: true },
      });

      await tx.user.update({
        where: { id: args.userId },
        data: {
          planId: args.planId,
          creditsRemaining:
            creditStrategy === "add"
              ? (user?.creditsRemaining ?? 0) + args.creditsAmount
              : args.creditsAmount,
        },
      });
    }
  });

  if (createdPaymentId) {
    await createAffiliateCommissionForPayment(createdPaymentId);
  }

  return { processedAlready, paymentId: createdPaymentId };
}

export async function runPostPaymentSideEffects(args: {
  userId: string;
  notificationMessage?: string;
  hireUsPackageSlug?: string;
  hireUsSourceCurationId?: string;
  skipNotification?: boolean;
  skipCacheInvalidation?: boolean;
}) {
  if (args.hireUsPackageSlug) {
    const packageSlug = parseHireUsPackageSlug(args.hireUsPackageSlug);
    if (packageSlug) {
      await finalizeHireUsPurchase({ userId: args.userId, packageSlug });
      if (args.hireUsSourceCurationId) {
        await attachHireUsCuration({
          userId: args.userId,
          curationId: args.hireUsSourceCurationId,
          packageSlug,
        });
      }
    }
  }

  if (!args.skipNotification && args.notificationMessage) {
    try {
      await db.notification.create({
        data: {
          userId: args.userId,
          type: "payment_success",
          title: "Payment successful",
          message: args.notificationMessage,
        },
      });
    } catch (error) {
      console.error("Post-payment notification create failed (non-fatal):", error);
    }
  }

  if (!args.skipCacheInvalidation) {
    try {
      await invalidateUserProfile(args.userId);
    } catch (error) {
      console.error("Post-payment cache invalidation failed (non-fatal):", error);
    }
  }
}

async function getRazorpayCredentials(): Promise<{ keyId: string; keySecret: string; currency: string }> {
  const row = await getGatewayConfigById("razorpay");

  if (!row) throw new PaymentConfigurationError("Razorpay credentials are not configured in Payment Settings.");
  if (!row.is_active) throw new PaymentConfigurationError("Razorpay is not the active payment gateway. Activate it in Admin → Settings → Payment.");

  const keyId = row.public_key?.trim();
  if (!keyId) throw new PaymentConfigurationError("Razorpay Key ID (Public Key) is not configured in Payment Settings.");

  const keySecret = getDecryptedValueOrThrow(
    row.secret_key,
    "Razorpay Key Secret is not configured in Payment Settings.",
    "Razorpay Key Secret in Payment Settings is invalid."
  );

  const additionalConfig = (typeof row.additional_config === "object" && row.additional_config !== null)
    ? row.additional_config as Record<string, unknown>
    : {};
  const currency = typeof additionalConfig.currency === "string" ? additionalConfig.currency.toUpperCase() : "INR";

  return { keyId, keySecret, currency };
}

export async function getRazorpayRuntimeCredentials(): Promise<{ keyId: string; keySecret: string; currency: string }> {
  return getRazorpayCredentials();
}

export async function getRazorpayWebhookSecret(): Promise<string> {
  const row = await getGatewayConfigById("razorpay");
  if (!row?.is_active) {
    throw new PaymentConfigurationError("Razorpay is not active. Activate it in Admin → Settings → Payment.");
  }

  return getDecryptedValueOrThrow(
    row.webhook_secret,
    "Razorpay webhook secret is not configured in Payment Settings.",
    "Razorpay webhook secret in Payment Settings is invalid."
  );
}

async function resolveCheckoutProvider(provider?: ActivePaymentProvider): Promise<ActivePaymentProvider> {
  if (provider) {
    const rows = await db.$queryRaw<Array<{ provider: ActivePaymentProvider }>>`
      SELECT provider FROM payment_gateway_config
      WHERE is_active = true AND id = ${provider}
      LIMIT 1
    `;
    if (!rows[0]) {
      throw new PaymentConfigurationError(`Payment provider "${provider}" is not active.`);
    }
    return rows[0].provider;
  }

  const config = await getPaymentConfigRow();
  if (!config) {
    throw new PaymentConfigurationError(
      "No payment gateway is active. Go to Admin → Settings → Payment and activate one."
    );
  }

  return config.provider;
}

async function createStripeCheckoutResult(args: {
  userId: string;
  planId: string;
  stripeCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  amountCentsOverride?: number;
  currencyOverride?: string;
  displayNameOverride?: string;
}): Promise<CheckoutResult> {
  const stripeSecretKey = await getStripeSecretKey();
  const url = await createCheckoutSession({
    ...args,
    stripeSecretKey,
    oneTimeAmountCents: args.amountCentsOverride,
    oneTimeCurrency: args.currencyOverride,
    oneTimeProductName: args.displayNameOverride,
  });
  return { type: "redirect", url };
}

async function createPayPalCheckoutResult(args: {
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  amountCentsOverride?: number;
  currencyOverride?: string;
  displayNameOverride?: string;
}): Promise<CheckoutResult> {
  const { clientId, secret, mode } = await getPayPalCredentials();

  const plan = await db.planConfig.findUnique({
    where: { id: args.planId },
    select: { priceCents: true, name: true },
  });
  if (!plan) throw new PaymentConfigurationError("Plan not found.");

  const amountCents = args.amountCentsOverride ?? plan.priceCents;
  const currency = (args.currencyOverride ?? "USD").toUpperCase();
  if (currency !== "USD") {
    throw new PaymentConfigurationError("PayPal checkout currently supports USD only.");
  }

  const amountUsd = (amountCents / 100).toFixed(2);
  const accessToken = await getPayPalAccessToken(clientId, secret, mode);
  const captureBase = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paypal-capture`;
  const { orderId, approveUrl } = await createPayPalOrder({
    accessToken,
    mode,
    amountUsd,
    planName: args.displayNameOverride ?? plan.name,
    returnUrl: captureBase,
    cancelUrl: args.cancelUrl,
  });

  await redis.set(
    `paypal:order:${orderId}`,
    JSON.stringify({
      planId: args.planId,
      userId: args.userId,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      metadata: args.metadata ?? null,
    }),
    { ex: 1800 }
  );

  return { type: "redirect", url: approveUrl };
}

async function createRazorpayCheckoutResult(args: {
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  amountCentsOverride?: number;
  currencyOverride?: string;
  displayNameOverride?: string;
}): Promise<CheckoutResult> {
  const { keyId, keySecret, currency } = await getRazorpayCredentials();

  const plan = await db.planConfig.findUnique({
    where: { id: args.planId },
    select: { priceCents: true, name: true },
  });
  if (!plan) throw new PaymentConfigurationError("Plan not found.");

  const checkoutCurrency = (args.currencyOverride ?? currency).toUpperCase();
  const checkoutAmountCents = args.amountCentsOverride ?? plan.priceCents;

  const { orderId, amount } = await createRazorpayOrder({
    keyId,
    keySecret,
    amountSmallestUnit: checkoutAmountCents,
    currency: checkoutCurrency,
    receipt: `plan_${args.planId.slice(-8)}_${Date.now()}`,
  });

  await redis.set(
    `razorpay:order:${orderId}`,
    JSON.stringify({
      planId: args.planId,
      userId: args.userId,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      amountCents: checkoutAmountCents,
      currency: checkoutCurrency,
      metadata: args.metadata ?? null,
    }),
    { ex: 60 * 60 * 24 }
  );

  return {
    type: "razorpay",
    orderId,
    amount,
    currency: checkoutCurrency,
    keyId,
    planName: args.displayNameOverride ?? plan.name,
    successUrl: args.successUrl,
    cancelUrl: args.cancelUrl,
  };
}

export async function createCheckoutForActiveProvider(args: {
  userId: string;
  planId: string;
  stripeCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  provider?: ActivePaymentProvider; // if omitted and multiple active, caller should pick
  metadata?: Record<string, string>;
  amountCentsOverride?: number;
  currencyOverride?: string;
  displayNameOverride?: string;
}): Promise<CheckoutResult> {
  const provider = await resolveCheckoutProvider(args.provider);

  if (provider === "stripe") return createStripeCheckoutResult(args);
  if (provider === "paypal") return createPayPalCheckoutResult(args);
  if (provider === "razorpay") return createRazorpayCheckoutResult(args);

  throw new UnsupportedPaymentProviderError(provider);
}

export async function createPortalForActiveProvider(args: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripeSecretKey = await getStripeSecretKey();

  return createPortalSession(args.stripeCustomerId, args.returnUrl, stripeSecretKey);
}
