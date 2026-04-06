import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { getPayPalAccessToken, capturePayPalOrder } from "@/lib/payments/paypal";
import { applyPlanPaymentAndCredits, getPayPalRuntimeCredentials, runPostPaymentSideEffects } from "@/lib/payments/service";
import { parseHireUsPackageSlug } from "@/lib/hire-us";

// PayPal redirects here after the user approves payment on PayPal's site.
// Query params from PayPal: token (= orderId), PayerID
// We look up planId + userId from Redis using the orderId as the key.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("token"); // PayPal calls this "token"

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const defaultCancelUrl = `${appUrl}/onboarding/plan`;
  const defaultSuccessUrl = `${appUrl}/onboarding/curation?paid=1`;

  if (!orderId) {
    return NextResponse.redirect(`${defaultCancelUrl}?error=missing_token`);
  }

  // Look up the pending order metadata we stored in Redis at order creation
  const raw = await redis.get<string>(`paypal:order:${orderId}`);
  if (!raw) {
    // Token expired or unknown — don't activate any plan
    return NextResponse.redirect(`${defaultCancelUrl}?error=order_expired`);
  }

  let planId: string;
  let userId: string;
  let successUrl: string;
  let cancelUrl: string;
  let hireUsPackage: string | undefined;
  let hireUsSourceCurationId: string | undefined;
  let isHireUsFlow = false;
  try {
    const meta = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as {
      planId: string;
      userId: string;
      successUrl?: string;
      cancelUrl?: string;
      metadata?: { flow?: string; hireUsPackage?: string; hireUsSourceCurationId?: string };
    };
    planId = meta.planId;
    userId = meta.userId;
    successUrl = meta.successUrl ?? defaultSuccessUrl;
    cancelUrl = meta.cancelUrl ?? defaultCancelUrl;
    hireUsPackage = meta.metadata?.hireUsPackage;
    hireUsSourceCurationId = meta.metadata?.hireUsSourceCurationId;
    isHireUsFlow = meta.metadata?.flow === "hire_us";
    if (!planId || !userId) throw new Error("missing fields");
  } catch {
    return NextResponse.redirect(`${defaultCancelUrl}?error=invalid_order`);
  }

  try {
    const { clientId, secret, mode } = await getPayPalRuntimeCredentials();

    const accessToken = await getPayPalAccessToken(clientId, secret, mode);

    // ── CRITICAL: capture money + activate plan ────────────────────────────
    // Any failure here redirects to cancel (payment not taken or plan not active)
    const { amountCents, currency } = await capturePayPalOrder({ accessToken, mode, orderId });

    const plan = await db.planConfig.findUnique({
      where: { id: planId },
      select: { credits: true },
    });
    if (!plan) {
      // Captured but plan missing — log for manual reconciliation
      console.error(`PayPal order ${orderId} captured but planId ${planId} not found. userId=${userId}`);
      return NextResponse.redirect(`${cancelUrl}?error=plan_not_found`);
    }

    const { processedAlready } = await applyPlanPaymentAndCredits({
      userId,
      planId,
      providerPaymentId: orderId,
      amountCents,
      currency,
      creditsAmount: plan.credits,
      paymentType: isHireUsFlow || !!parseHireUsPackageSlug(hireUsPackage) ? "hire_us" : "plan",
    });

    const packageSlug = parseHireUsPackageSlug(hireUsPackage);
    if (!processedAlready) {
      await runPostPaymentSideEffects({
        userId,
        notificationMessage: packageSlug
          ? undefined
          : "Your plan has been upgraded via PayPal. Credits have been added to your account.",
        hireUsPackageSlug: packageSlug ?? undefined,
        hireUsSourceCurationId,
        skipNotification: !!packageSlug,
      });
    } else {
      await runPostPaymentSideEffects({
        userId,
        hireUsPackageSlug: packageSlug ?? undefined,
        hireUsSourceCurationId,
        skipNotification: true,
      });
    }

    // Clean up Redis key now that plan is activated
    await redis.del(`paypal:order:${orderId}`);

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.redirect(`${cancelUrl}?error=capture_failed`);
  }
}
