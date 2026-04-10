import type Stripe from "stripe";
import { db } from "@/lib/db";
import { encryptField, hashLookupValue } from "@/lib/server-utils";
import { parseHireUsPackageSlug } from "@/lib/hire-us";
import { runPostPaymentSideEffects } from "@/lib/payments/service";
import { createAffiliateCommissionForPayment } from "@/lib/referrals/commissions";

function buildStripePaymentLookup(session: Stripe.Checkout.Session) {
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

  const or: Array<{ stripePaymentIntentId?: string; stripeSubscriptionId?: string }> = [];
  if (paymentIntentId) or.push({ stripePaymentIntentId: paymentIntentId });
  if (subscriptionId) or.push({ stripeSubscriptionId: subscriptionId });

  return {
    paymentIntentId,
    subscriptionId,
    where: or.length > 0 ? { OR: or } : undefined,
  };
}

export async function fulfillStripeCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  if (!userId || !planId) {
    return { status: "ignored" as const };
  }

  const isHireUsFlow = session.metadata?.flow === "hire_us";
  const hireUsPackage = parseHireUsPackageSlug(session.metadata?.hireUsPackage);
  const hireUsSourceCurationId = session.metadata?.hireUsSourceCurationId;
  const paymentType = isHireUsFlow || !!hireUsPackage ? "hire_us" : "plan";
  const { paymentIntentId, subscriptionId, where } = buildStripePaymentLookup(session);

  const plan = await db.planConfig.findUnique({
    where: { id: planId },
    select: { credits: true },
  });
  if (!plan) {
    return { status: "ignored" as const };
  }

  let createdPayment = false;
  let createdPaymentId: string | null = null;

  await db.$transaction(async (tx) => {
    const existingPayment = where
      ? await tx.payment.findFirst({ where, select: { id: true } })
      : null;
    const user = paymentType === "plan"
      ? await tx.user.findUnique({
          where: { id: userId },
          select: { creditsRemaining: true },
        })
      : null;

    if (!existingPayment) {
      const payment = await tx.payment.create({
        data: {
          userId,
          planId,
          stripePaymentIntentId: paymentIntentId,
          stripeSubscriptionId: subscriptionId,
          paymentType,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
          status: "completed",
        },
      });
      createdPaymentId = payment.id;
      createdPayment = true;
    }

    if (createdPayment && paymentType === "plan") {
      await tx.user.update({
        where: { id: userId },
        data: {
          planId,
          creditsRemaining: (user?.creditsRemaining ?? 0) + plan.credits,
          ...(typeof session.customer === "string"
            ? {
                stripeCustomerId: encryptField(session.customer),
                stripeCustomerHash: hashLookupValue(session.customer),
              }
            : {}),
        },
      });
    } else if (createdPayment && typeof session.customer === "string") {
      await tx.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: encryptField(session.customer),
          stripeCustomerHash: hashLookupValue(session.customer),
        },
      });
    }
  });

  if (createdPaymentId) {
    await createAffiliateCommissionForPayment(createdPaymentId);
  }

  const hireUsPackageSlug = isHireUsFlow ? hireUsPackage ?? undefined : undefined;

  if (createdPayment) {
    await runPostPaymentSideEffects({
      userId,
      hireUsPackageSlug,
      hireUsSourceCurationId,
      notificationMessage:
        paymentType === "plan"
          ? "Your plan has been upgraded. Credits have been added to your account."
          : undefined,
      skipNotification: paymentType !== "plan",
    });
  } else {
    await runPostPaymentSideEffects({
      userId,
      hireUsPackageSlug,
      hireUsSourceCurationId,
      skipNotification: true,
    });
  }

  return {
    status: createdPayment ? ("completed" as const) : ("already_processed" as const),
    userId,
  };
}