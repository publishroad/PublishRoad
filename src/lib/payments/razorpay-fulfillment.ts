import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { parseHireUsPackageSlug } from "@/lib/hire-us";
import { applyPlanPaymentAndCredits, runPostPaymentSideEffects } from "@/lib/payments/service";

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
  metadata?: { flow?: string; hireUsPackage?: string; hireUsSourceCurationId?: string };
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

function resolveResultUrls(meta: StoredRazorpayOrderMeta, defaults: { successUrl: string; cancelUrl: string }) {
  return {
    successUrl: meta.successUrl ?? defaults.successUrl,
    cancelUrl: meta.cancelUrl ?? defaults.cancelUrl,
  };
}

async function findExistingPaymentUserId(paymentId: string): Promise<string | null> {
  const existing = await db.payment.findFirst({
    where: { providerPaymentId: paymentId },
    select: { userId: true },
  });
  return existing?.userId ?? null;
}

async function upsertPaymentAndApplyCredits(args: {
  paymentId: string;
  meta: StoredRazorpayOrderMeta;
  fallbackCurrency?: string;
}): Promise<{ status: "processed_new" | "already_processed" | "plan_not_found" }> {
  const plan = await db.planConfig.findUnique({
    where: { id: args.meta.planId },
    select: { credits: true, priceCents: true },
  });

  if (!plan) {
    return { status: "plan_not_found" };
  }

  const hireUsPackage = parseHireUsPackageSlug(args.meta.metadata?.hireUsPackage);
  const paymentType = args.meta.metadata?.flow === "hire_us" || !!hireUsPackage ? "hire_us" : "plan";

  const { processedAlready } = await applyPlanPaymentAndCredits({
    userId: args.meta.userId,
    planId: args.meta.planId,
    providerPaymentId: args.paymentId,
    amountCents:
      typeof args.meta.amountCents === "number" && Number.isFinite(args.meta.amountCents) && args.meta.amountCents > 0
        ? Math.round(args.meta.amountCents)
        : plan.priceCents,
    currency: (args.meta.currency ?? args.fallbackCurrency ?? "usd").toLowerCase(),
    creditsAmount: plan.credits,
    paymentType,
  });

  return { status: processedAlready ? "already_processed" : "processed_new" };
}

async function runPostFulfillmentSideEffects(args: {
  userId: string;
  paymentId: string;
  orderId: string;
  paymentSource: "checkout_capture" | "webhook";
  hireUsPackage?: string;
  hireUsSourceCurationId?: string;
}) {
  const packageSlug = parseHireUsPackageSlug(args.hireUsPackage);

  await redis.set(`razorpay:processed:payment:${args.paymentId}`, "1", { ex: 60 * 60 * 24 * 30 });
  await redis.del(`razorpay:order:${args.orderId}`);

  await runPostPaymentSideEffects({
    userId: args.userId,
    hireUsPackageSlug: packageSlug ?? undefined,
    hireUsSourceCurationId: args.hireUsSourceCurationId,
    notificationMessage:
      packageSlug
        ? undefined
        : args.paymentSource === "webhook"
          ? "Your plan has been upgraded via Razorpay. Payment was confirmed by webhook."
          : "Your plan has been upgraded via Razorpay. Credits have been added to your account.",
    skipNotification: !!packageSlug,
  });
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
  const existingByPaymentUserId = await findExistingPaymentUserId(args.paymentId);

  if (!raw) {
    if (existingByPaymentUserId) {
      return {
        status: "already_processed",
        userId: existingByPaymentUserId,
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

  const { successUrl, cancelUrl } = resolveResultUrls(meta, {
    successUrl: args.defaultSuccessUrl,
    cancelUrl: args.defaultCancelUrl,
  });

  if (existingByPaymentUserId) {
    await redis.del(`razorpay:order:${args.orderId}`);
    return {
      status: "already_processed",
      userId: existingByPaymentUserId,
      successUrl,
      cancelUrl,
    };
  }

  try {
    const writeStatus = await upsertPaymentAndApplyCredits({
      paymentId: args.paymentId,
      meta,
      fallbackCurrency: args.currency,
    });

    if (writeStatus.status === "plan_not_found") {
      return {
        status: "plan_not_found",
        cancelUrl,
        successUrl,
      };
    }

    if (writeStatus.status === "already_processed") {
      await redis.del(`razorpay:order:${args.orderId}`);
      return {
        status: "already_processed",
        userId: meta.userId,
        successUrl,
        cancelUrl,
      };
    }

    await runPostFulfillmentSideEffects({
      userId: meta.userId,
      paymentId: args.paymentId,
      orderId: args.orderId,
      paymentSource: args.paymentSource,
      hireUsPackage: meta.metadata?.hireUsPackage,
      hireUsSourceCurationId: meta.metadata?.hireUsSourceCurationId,
    });

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
