import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { invalidateUserProfile } from "@/lib/cache";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { getPaymentConfigRow } from "@/lib/payments/service";
import { decryptField } from "@/lib/server-utils";
import { z } from "zod";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const defaultCancelUrl = `${appUrl}/onboarding/plan?error=payment_failed`;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  // Look up pending order metadata from Redis
  const raw = await redis.get<string>(`razorpay:order:${razorpay_order_id}`);
  if (!raw) {
    return NextResponse.json({ error: "order_expired", redirectUrl: `${defaultCancelUrl}&reason=order_expired` }, { status: 400 });
  }

  let planId: string;
  let userId: string;
  let successUrl: string;
  let cancelUrl: string;
  try {
    const meta = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as {
      planId: string; userId: string; successUrl?: string; cancelUrl?: string;
    };
    planId = meta.planId;
    userId = meta.userId;
    successUrl = meta.successUrl ?? `${appUrl}/onboarding/curation?paid=1`;
    cancelUrl = meta.cancelUrl ?? `${appUrl}/onboarding/plan`;
    if (!planId || !userId) throw new Error("missing fields");
  } catch {
    return NextResponse.json({ error: "invalid_order", redirectUrl: defaultCancelUrl }, { status: 400 });
  }

  // Verify HMAC signature
  try {
    const config = await getPaymentConfigRow();
    if (!config || config.provider !== "razorpay") {
      return NextResponse.json({ error: "provider_mismatch", redirectUrl: `${cancelUrl}?error=provider_mismatch` }, { status: 400 });
    }

    const keySecret = decryptField(config.secret_key!);
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      keySecret,
    });

    if (!isValid) {
      console.error(`Razorpay signature verification failed for order ${razorpay_order_id}`);
      return NextResponse.json({ error: "invalid_signature", redirectUrl: `${cancelUrl}?error=signature_failed` }, { status: 400 });
    }
  } catch (err) {
    console.error("Razorpay signature check error:", err);
    return NextResponse.json({ error: "verification_error", redirectUrl: `${cancelUrl}?error=verification_failed` }, { status: 500 });
  }

  // ── CRITICAL: activate plan ───────────────────────────────────────────────
  try {
    const plan = await db.planConfig.findUnique({
      where: { id: planId },
      select: { credits: true, priceCents: true },
    });
    if (!plan) {
      console.error(`Razorpay: payment verified but planId ${planId} not found. userId=${userId}`);
      return NextResponse.json({ error: "plan_not_found", redirectUrl: `${cancelUrl}?error=plan_not_found` }, { status: 400 });
    }

    await db.payment.create({
      data: {
        userId,
        planId,
        amountCents: plan.priceCents,
        currency: "inr",
        status: "completed",
      },
    });

    await db.user.update({
      where: { id: userId },
      data: { planId, creditsRemaining: plan.credits },
    });

    await redis.del(`razorpay:order:${razorpay_order_id}`);
  } catch (err) {
    console.error("Razorpay plan activation error:", err);
    return NextResponse.json({ error: "activation_failed", redirectUrl: `${cancelUrl}?error=activation_failed` }, { status: 500 });
  }

  // ── NON-CRITICAL ──────────────────────────────────────────────────────────
  try {
    await db.notification.create({
      data: {
        userId,
        type: "payment_success",
        title: "Payment successful",
        message: "Your plan has been upgraded via Razorpay. Credits have been added to your account.",
      },
    });
  } catch (e) {
    console.error("Razorpay capture: notification create failed (non-fatal):", e);
  }

  try {
    await invalidateUserProfile(userId);
  } catch (e) {
    console.error("Razorpay capture: cache invalidation failed (non-fatal):", e);
  }

  return NextResponse.json({ success: true, redirectUrl: successUrl });
}
