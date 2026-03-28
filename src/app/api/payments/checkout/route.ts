import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/server-utils";
import {
  createCheckoutForActiveProvider,
  getActivePaymentProvidersList,
  PaymentConfigurationError,
  UnsupportedPaymentProviderError,
  type ActivePaymentProvider,
} from "@/lib/payments/service";
import { z } from "zod";

const schema = z.object({
  planId: z.string().min(1),
  // If multiple gateways are active, the frontend re-calls with this set
  provider: z.enum(["stripe", "razorpay", "paypal"]).optional(),
  // Optional paths (must start with "/") — used to control where user lands after payment.
  successPath: z.string().startsWith("/").optional(),
  cancelPath: z.string().startsWith("/").optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan ID" }, { status: 422 });
  }

  const { planId, provider, successPath, cancelPath } = parsed.data;
  const userId = session.user.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const successUrl = `${appUrl}${successPath ?? "/onboarding/curation"}?paid=1`;
  const cancelUrl = `${appUrl}${cancelPath ?? "/onboarding/plan"}`;

  const [user, plan] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } }),
    db.planConfig.findUnique({ where: { id: planId, isActive: true } }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!plan) return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });

  // If no provider specified, check how many are active
  if (!provider) {
    const activeProviders = await getActivePaymentProvidersList();
    if (activeProviders.length === 0) {
      return NextResponse.json({ error: "No payment gateway is active. Contact support." }, { status: 400 });
    }
    if (activeProviders.length > 1) {
      // Let the frontend show a payment method picker
      return NextResponse.json({ selectProvider: activeProviders });
    }
    // Exactly 1 active — fall through to checkout with that provider
  }

  const stripeCustomerId = user.stripeCustomerId ? decryptField(user.stripeCustomerId) : null;

  try {
    const result = await createCheckoutForActiveProvider({
      userId,
      planId,
      stripeCustomerId,
      successUrl,
      cancelUrl,
      provider: provider as ActivePaymentProvider | undefined,
    });

    if (result.type === "razorpay") {
      return NextResponse.json({ razorpay: result });
    }
    return NextResponse.json({ url: result.url });
  } catch (error) {
    if (error instanceof UnsupportedPaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 501 });
    }
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
