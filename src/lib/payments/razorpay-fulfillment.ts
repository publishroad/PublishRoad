import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { invalidateUserProfile } from "@/lib/cache";
import { finalizeHireUsPurchase, parseHireUsPackageSlug } from "@/lib/hire-us";

export type RazorpayFulfillmentResult =
  | {
      status: "completed" | "already_processed";
      userId: string;
      successUrl: string;
      cancelUrl: string;
    }
  | {
      status: "order_expired" | "invalid_order" | "plan_not_found" | "internal_error";
      cancelUrl: string;
      successUrl: string;
    };

type StoredRazorpayOrderMeta = {
  planId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
  amountCents?: number;
  currency?: string;
  metadata?: { hireUsPackage?: string };
};

function parseStoredMeta(raw: unknown): StoredRazorpayOrderMeta | null {
  try {
    const meta = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as StoredRazorpayOrderMeta;
    if (!meta.planId || !meta.userId) return null;
    return meta;
  } catch {
    return null;
  }
}

export async function fulfillRazorpayOrder(args: {
  orderId: string;
  paymentId: string;
  defaultSuccessUrl: string;
  defaultCancelUrl: string;
  currency?: string;
  paymentSource: "checkout_capture" | "webhook";
}): Promise<RazorpayFulfillmentResult> {
  const raw = await redis.get<string>(`razorpay:order:${args.orderId}`);

  const existingByPaymentId = await db.payment.findFirst({
    where: { providerPaymentId: args.paymentId },
    select: { userId: true },
  });

  if (!raw) {
    if (existingByPaymentId) {
      return {
        status: "already_processed",
        userId: existingByPaymentId.userId,
        successUrl: args.defaultSuccessUrl,
        cancelUrl: args.defaultCancelUrl,
      };
    }
    return {
      status: "order_expired",
      cancelUrl: args.defaultCancelUrl,
      successUrl: args.defaultSuccessUrl,
    };
  }

  const meta = parseStoredMeta(raw);
  if (!meta) {
    return {
      status: "invalid_order",
      cancelUrl: args.defaultCancelUrl,
      successUrl: args.defaultSuccessUrl,
    };
  }

  const successUrl = meta.successUrl ?? args.defaultSuccessUrl;
  const cancelUrl = meta.cancelUrl ?? args.defaultCancelUrl;

  if (existingByPaymentId) {
    await redis.del(`razorpay:order:${args.orderId}`);
    return {
      status: "already_processed",
      userId: existingByPaymentId.userId,
      successUrl,
      cancelUrl,
    };
  }

  try {
    const plan = await db.planConfig.findUnique({
      where: { id: meta.planId },
      select: { credits: true, priceCents: true },
    });

    if (!plan) {
      return {
        status: "plan_not_found",
        cancelUrl,
        successUrl,
      };
    }

    let processedAlready = false;

    await db.$transaction(async (tx) => {
      const existing = await tx.payment.findFirst({
        where: { providerPaymentId: args.paymentId },
        select: { id: true },
      });
      if (existing) {
        processedAlready = true;
        return;
      }

      await tx.payment.create({
        data: {
          userId: meta.userId,
          planId: meta.planId,
          providerPaymentId: args.paymentId,
          amountCents:
            typeof meta.amountCents === "number" && Number.isFinite(meta.amountCents) && meta.amountCents > 0
              ? Math.round(meta.amountCents)
              : plan.priceCents,
          currency: (meta.currency ?? args.currency ?? "usd").toLowerCase(),
          status: "completed",
        },
      });

      await tx.user.update({
        where: { id: meta.userId },
        data: {
          planId: meta.planId,
          creditsRemaining: plan.credits,
        },
      });
    });

    const packageSlug = parseHireUsPackageSlug(meta.metadata?.hireUsPackage);
    if (packageSlug) {
      await finalizeHireUsPurchase({ userId: meta.userId, packageSlug });
    }

    await redis.set(`razorpay:processed:payment:${args.paymentId}`, "1", { ex: 60 * 60 * 24 * 30 });
    await redis.del(`razorpay:order:${args.orderId}`);

    if (processedAlready) {
      return {
        status: "already_processed",
        userId: meta.userId,
        successUrl,
        cancelUrl,
      };
    }

    try {
      await db.notification.create({
        data: {
          userId: meta.userId,
          type: "payment_success",
          title: "Payment successful",
          message:
            args.paymentSource === "webhook"
              ? "Your plan has been upgraded via Razorpay. Payment was confirmed by webhook."
              : "Your plan has been upgraded via Razorpay. Credits have been added to your account.",
        },
      });
    } catch (error) {
      console.error("Razorpay fulfillment: notification create failed (non-fatal):", error);
    }

    try {
      await invalidateUserProfile(meta.userId);
    } catch (error) {
      console.error("Razorpay fulfillment: cache invalidation failed (non-fatal):", error);
    }

    return {
      status: "completed",
      userId: meta.userId,
      successUrl,
      cancelUrl,
    };
  } catch (error) {
    console.error("Razorpay fulfillment internal error:", error);
    return {
      status: "internal_error",
      cancelUrl,
      successUrl,
    };
  }
}
