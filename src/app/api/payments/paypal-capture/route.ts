import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { invalidateUserProfile } from "@/lib/cache";
import { getPayPalAccessToken, capturePayPalOrder } from "@/lib/payments/paypal";
import { getPaymentConfigRow } from "@/lib/payments/service";

// PayPal redirects here after the user approves payment on PayPal's site.
// Query params from PayPal: token (= orderId), PayerID
// We look up planId + userId from Redis using the orderId as the key.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("token"); // PayPal calls this "token"

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const cancelUrl = `${appUrl}/onboarding/plan`;
  const successUrl = `${appUrl}/onboarding/curation?paid=1`;

  if (!orderId) {
    return NextResponse.redirect(`${cancelUrl}?error=missing_token`);
  }

  // Look up the pending order metadata we stored in Redis at order creation
  const raw = await redis.get<string>(`paypal:order:${orderId}`);
  if (!raw) {
    // Token expired or unknown — don't activate any plan
    return NextResponse.redirect(`${cancelUrl}?error=order_expired`);
  }

  let planId: string;
  let userId: string;
  try {
    const meta = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as { planId: string; userId: string };
    planId = meta.planId;
    userId = meta.userId;
    if (!planId || !userId) throw new Error("missing fields");
  } catch {
    return NextResponse.redirect(`${cancelUrl}?error=invalid_order`);
  }

  try {
    const config = await getPaymentConfigRow();
    if (!config || config.provider !== "paypal") {
      return NextResponse.redirect(`${cancelUrl}?error=provider_mismatch`);
    }

    // Decrypt credentials
    const { decryptField } = await import("@/lib/server-utils");
    const rows = await db.$queryRaw<Array<{ public_key: string | null; additional_config: unknown }>>`
      SELECT public_key, additional_config FROM payment_gateway_config WHERE id = 'paypal' LIMIT 1
    `;
    const row = rows[0];
    const clientId = row?.public_key?.trim() ?? "";
    const secret = decryptField(config.secret_key!);
    const additionalConfig = (typeof row?.additional_config === "object" && row.additional_config !== null)
      ? row.additional_config as Record<string, unknown>
      : {};
    const mode = typeof additionalConfig.mode === "string" ? additionalConfig.mode : "live";

    const accessToken = await getPayPalAccessToken(clientId, secret, mode);
    const { amountCents, currency } = await capturePayPalOrder({ accessToken, mode, orderId });

    // Activate plan for user
    const plan = await db.planConfig.findUnique({
      where: { id: planId },
      select: { credits: true },
    });
    if (!plan) {
      return NextResponse.redirect(`${cancelUrl}?error=plan_not_found`);
    }

    await db.payment.create({
      data: {
        userId,
        planId,
        amountCents,
        currency,
        status: "completed",
      },
    });

    await db.user.update({
      where: { id: userId },
      data: { planId, creditsRemaining: plan.credits },
    });

    await db.notification.create({
      data: {
        userId,
        type: "payment_success",
        title: "Payment successful",
        message: "Your plan has been upgraded via PayPal. Credits have been added to your account.",
      },
    });

    await invalidateUserProfile(userId);

    // Clean up the Redis key
    await redis.del(`paypal:order:${orderId}`);

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.redirect(`${cancelUrl}?error=capture_failed`);
  }
}
