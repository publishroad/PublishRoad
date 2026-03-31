import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import {
  HIRE_US_PACKAGES,
  parseHireUsPackageSlug,
  resolveHireUsCheckoutPlanId,
} from "@/lib/hire-us";

const schema = z.object({
  packageSlug: z.enum(["starter", "complete"]),
  provider: z.enum(["stripe", "razorpay", "paypal"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid package" }, { status: 422 });
  }

  const packageSlug = parseHireUsPackageSlug(parsed.data.packageSlug);
  if (!packageSlug) {
    return NextResponse.json({ error: "Invalid package" }, { status: 422 });
  }
  const packageConfig = HIRE_US_PACKAGES[packageSlug];

  const planId = await resolveHireUsCheckoutPlanId(packageSlug);
  if (!planId) {
    return NextResponse.json({ error: "Hire Us checkout mapping is not configured" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!parsed.data.provider) {
    const activeProviders = await getActivePaymentProvidersList();
    if (activeProviders.length === 0) {
      return NextResponse.json({ error: "No payment gateway is active. Contact support." }, { status: 400 });
    }
    if (activeProviders.length > 1) {
      return NextResponse.json({ selectProvider: activeProviders });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const successPath = `/onboarding/curation?hireUs=1&hireUsPackage=${packageSlug}`;
  const successUrl = `${appUrl}${successPath}${successPath.includes("?") ? "&" : "?"}paid=1`;
  const cancelUrl = `${appUrl}/onboarding/hire-us?package=${packageSlug}`;

  const stripeCustomerId = user.stripeCustomerId ? decryptField(user.stripeCustomerId) : null;

  try {
    const result = await createCheckoutForActiveProvider({
      userId: session.user.id,
      planId,
      stripeCustomerId,
      successUrl,
      cancelUrl,
      provider: parsed.data.provider as ActivePaymentProvider | undefined,
      amountCentsOverride: packageConfig.priceCents,
      currencyOverride: packageConfig.currency,
      displayNameOverride: packageConfig.title,
      metadata: {
        flow: "hire_us",
        hireUsPackage: packageSlug,
      },
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
    console.error("Hire Us checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
