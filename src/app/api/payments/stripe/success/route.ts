import { NextRequest, NextResponse } from "next/server";
import { getStripeSecretKey } from "@/lib/payments/service";
import { fulfillStripeCheckoutSession } from "@/lib/payments/stripe-fulfillment";
import { retrieveCheckoutSession } from "@/lib/stripe";

function appendQueryParam(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function resolveRedirectPath(rawPath: string | null) {
  if (!rawPath || !rawPath.startsWith("/")) {
    return "/dashboard/billing?paid=1";
  }
  return rawPath;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const nextPath = resolveRedirectPath(searchParams.get("next"));

  if (!sessionId) {
    return NextResponse.redirect(new URL(appendQueryParam(nextPath, "error", "missing_session"), req.url));
  }

  try {
    const stripeSecretKey = await getStripeSecretKey({ requireActive: false });
    const session = await retrieveCheckoutSession(sessionId, stripeSecretKey);

    const canActivate =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      session.mode === "subscription";

    if (session.status !== "complete" || !canActivate) {
      return NextResponse.redirect(new URL(appendQueryParam(nextPath, "error", "payment_incomplete"), req.url));
    }

    await fulfillStripeCheckoutSession(session);

    return NextResponse.redirect(new URL(nextPath, req.url));
  } catch (error) {
    console.error("Stripe success activation failed:", error);
    return NextResponse.redirect(new URL(appendQueryParam(nextPath, "error", "activation_failed"), req.url));
  }
}