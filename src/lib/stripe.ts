import Stripe from "stripe";
import { db } from "./db";

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder",
  { apiVersion: "2026-02-25.clover", typescript: true }
);

// ─────────────────────────────────────────────
// Create Stripe Checkout Session
// ─────────────────────────────────────────────
export async function createCheckoutSession({
  userId,
  planId,
  stripeCustomerId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  planId: string;
  stripeCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const plan = await db.planConfig.findUnique({
    where: { id: planId, isActive: true },
  });

  if (!plan) throw new Error(`Plan "${planId}" not found`);
  if (!plan.stripePriceId) throw new Error(`Plan "${planId}" has no Stripe price configured`);

  const mode: Stripe.Checkout.SessionCreateParams.Mode =
    plan.billingType === "monthly" ? "subscription" : "payment";

  const session = await stripe.checkout.sessions.create({
    mode,
    customer: stripeCustomerId ?? undefined,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planId },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_creation: stripeCustomerId ? undefined : "always",
  });

  return session.url!;
}

// ─────────────────────────────────────────────
// Create Stripe Customer Portal Session
// ─────────────────────────────────────────────
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ─────────────────────────────────────────────
// Verify Stripe webhook signature
// ─────────────────────────────────────────────
export function constructWebhookEvent(
  payload: Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// ─────────────────────────────────────────────
// Create or retrieve Stripe customer for user
// ─────────────────────────────────────────────
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    const { decryptField } = await import("./server-utils");
    return decryptField(user.stripeCustomerId);
  }

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

  const { encryptField } = await import("./server-utils");
  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: encryptField(customer.id) },
  });

  return customer.id;
}
