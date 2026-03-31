import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { getPaymentConfigRow } from "@/lib/payments/service";
import { decryptField } from "@/lib/server-utils";
import { fulfillRazorpayOrder } from "@/lib/payments/razorpay-fulfillment";
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

  let successUrl: string;
  let cancelUrl: string;
  try {
    const meta = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as {
      successUrl?: string;
      cancelUrl?: string;
    };
    successUrl = meta.successUrl ?? `${appUrl}/onboarding/curation?paid=1`;
    cancelUrl = meta.cancelUrl ?? `${appUrl}/onboarding/plan`;
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

  const fulfillment = await fulfillRazorpayOrder({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    defaultSuccessUrl: successUrl,
    defaultCancelUrl: cancelUrl,
    currency: "inr",
    paymentSource: "checkout_capture",
  });

  if (fulfillment.status === "completed" || fulfillment.status === "already_processed") {
    return NextResponse.json({ success: true, redirectUrl: fulfillment.successUrl });
  }

  if (fulfillment.status === "plan_not_found") {
    return NextResponse.json({ error: "plan_not_found", redirectUrl: `${fulfillment.cancelUrl}?error=plan_not_found` }, { status: 400 });
  }

  if (fulfillment.status === "order_expired" || fulfillment.status === "invalid_order") {
    return NextResponse.json({ error: fulfillment.status, redirectUrl: `${fulfillment.cancelUrl}?error=${fulfillment.status}` }, { status: 400 });
  }

  return NextResponse.json({ error: "activation_failed", redirectUrl: `${fulfillment.cancelUrl}?error=activation_failed` }, { status: 500 });
}
