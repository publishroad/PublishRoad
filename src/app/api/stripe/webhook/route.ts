import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { decryptField, hashLookupValue } from "@/lib/server-utils";
import { invalidateUserProfile } from "@/lib/cache";
import { getStripeWebhookSecret, isPaymentProviderActive } from "@/lib/payments/service";
import { parseHireUsPackageSlug } from "@/lib/hire-us";
import { fulfillStripeCheckoutSession } from "@/lib/payments/stripe-fulfillment";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LEGACY_CUSTOMER_LOOKUP_CACHE_TTL_SECONDS = 3600;
const LEGACY_CUSTOMER_SCAN_LIMIT = 100;

export async function POST(req: NextRequest) {
  const isStripeActive = await isPaymentProviderActive("stripe");
  if (!isStripeActive) {
    return NextResponse.json({ received: true, skipped: true }, { status: 200 });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = await getStripeWebhookSecret();

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.arrayBuffer();
  const bodyBuffer = Buffer.from(rawBody);

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(bodyBuffer, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Reject events older than 5 minutes
  if (Date.now() / 1000 - event.created > 300) {
    return NextResponse.json({ error: "Event too old" }, { status: 400 });
  }

  const existing = await db.processedStripeEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    await db.processedStripeEvent.create({
      data: { eventId: event.id, processedAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  await fulfillStripeCheckoutSession(session);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await findUserByStripeCustomer(subscription.customer as string);
  if (!user) return;

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return;

  const plan = await db.planConfig.findFirst({ where: { stripePriceId: priceId } });
  if (!plan) return;

  await db.user.update({
    where: { id: user.id },
    data: { planId: plan.id, creditsRemaining: plan.credits },
  });
  await invalidateUserProfile(user.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await findUserByStripeCustomer(subscription.customer as string);
  if (!user) return;

  const freePlan = await db.planConfig.findFirst({ where: { slug: "free" } });

  await db.user.update({
    where: { id: user.id },
    data: {
      planId: freePlan?.id ?? null,
      creditsRemaining: freePlan?.credits ?? 0,
    },
  });

  await db.notification.create({
    data: {
      userId: user.id,
      type: "system",
      title: "Subscription cancelled",
      message: "Your subscription has ended. You've been moved to the free plan.",
    },
  });

  await invalidateUserProfile(user.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const user = await findUserByStripeCustomer(invoice.customer as string);
  if (!user) return;

  // `payment_intent` on Invoice is available as a string ID in the expanded object
  const paymentIntentId =
    typeof (invoice as { payment_intent?: string }).payment_intent === "string"
      ? (invoice as { payment_intent?: string }).payment_intent!
      : null;

  if (paymentIntentId) {
    await db.payment.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: paymentIntentId,
        amountCents: invoice.amount_due,
        currency: invoice.currency,
        status: "failed",
      },
    });
  }

  await db.notification.create({
    data: {
      userId: user.id,
      type: "system",
      title: "Payment failed",
      message: "We couldn't process your payment. Please update your billing details.",
    },
  });
}

async function findUserByStripeCustomer(customerId: string) {
  const customerHash = hashLookupValue(customerId);
  const cacheKey = `stripe-customer:${customerHash}`;

  let cachedUserId: string | null = null;
  try {
    cachedUserId = await redis.get<string>(cacheKey);
  } catch (error) {
    console.warn("Redis get failed for stripe customer cache", { cacheKey, error });
  }

  if (cachedUserId) {
    const cachedUser = await db.user.findUnique({
      where: { id: cachedUserId },
      select: { id: true, stripeCustomerId: true },
    });

    if (cachedUser) {
      return cachedUser;
    }
  }

  const byHash = await db.user.findFirst({
    where: { stripeCustomerHash: customerHash },
    select: { id: true, stripeCustomerId: true },
  });

  if (byHash) {
    redis
      .set(cacheKey, byHash.id, { ex: LEGACY_CUSTOMER_LOOKUP_CACHE_TTL_SECONDS })
      .catch((error) => {
        console.warn("Redis set failed for stripe customer byHash cache", { cacheKey, error });
      });
    return byHash;
  }

  const users = await db.user.findMany({
    where: { stripeCustomerId: { not: null }, stripeCustomerHash: null },
    select: { id: true, stripeCustomerId: true },
    take: LEGACY_CUSTOMER_SCAN_LIMIT,
  });

  for (const user of users) {
    try {
      if (user.stripeCustomerId && decryptField(user.stripeCustomerId) === customerId) {
        await db.user.update({
          where: { id: user.id },
          data: { stripeCustomerHash: customerHash },
        });
        redis
          .set(cacheKey, user.id, { ex: LEGACY_CUSTOMER_LOOKUP_CACHE_TTL_SECONDS })
          .catch((error) => {
            console.warn("Redis set failed for stripe customer legacy cache", { cacheKey, error });
          });
        return user;
      }
    } catch (error) {
      console.error("Failed to decrypt legacy stripeCustomerId during webhook lookup", {
        userId: user.id,
        error,
      });
    }
  }
  return null;
}
