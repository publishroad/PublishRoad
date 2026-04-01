import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { fulfillRazorpayOrder } from "@/lib/payments/razorpay-fulfillment";
import { isPaymentProviderActive, getRazorpayWebhookSecret } from "@/lib/payments/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  currency?: string;
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity;
    };
  };
};

function extractPaymentEntity(payload: RazorpayWebhookPayload): RazorpayPaymentEntity | null {
  return payload.payload?.payment?.entity ?? null;
}

export async function POST(req: NextRequest) {
  const isRazorpayActive = await isPaymentProviderActive("razorpay");
  if (!isRazorpayActive) {
    return NextResponse.json({ received: true, skipped: true }, { status: 200 });
  }

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let eventPayload: RazorpayWebhookPayload;
  try {
    eventPayload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let webhookSecret = "";
  try {
    webhookSecret = await getRazorpayWebhookSecret();
  } catch {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 400 });
  }

  const isValid = verifyRazorpayWebhookSignature({
    payload: rawBody,
    signature,
    webhookSecret,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = eventPayload.event ?? "";
  if (eventType !== "payment.captured" && eventType !== "order.paid") {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  const payment = extractPaymentEntity(eventPayload);
  const orderId = payment?.order_id?.trim();
  const paymentId = payment?.id?.trim();
  if (!orderId || !paymentId) {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const defaultSuccessUrl = `${appUrl}/onboarding/curation?paid=1`;
  const defaultCancelUrl = `${appUrl}/onboarding/plan?error=payment_failed`;

  const fulfillment = await fulfillRazorpayOrder({
    orderId,
    paymentId,
    defaultSuccessUrl,
    defaultCancelUrl,
    currency: payment?.currency,
    paymentSource: "webhook",
  });

  if (fulfillment.status === "internal_error") {
    // Return 500 so Razorpay retries webhook delivery
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  if (fulfillment.status === "plan_not_found") {
    return NextResponse.json({ error: "Plan not found for captured payment" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
