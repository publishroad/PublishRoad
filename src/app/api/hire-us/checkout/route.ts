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
  getHireUsPackageDefinitions,
  parseHireUsPackageSlug,
  resolveHireUsCheckoutPlanId,
} from "@/lib/hire-us";

const schema = z.object({
  packageSlug: z.enum(["starter", "complete"]),
  provider: z.enum(["stripe", "razorpay", "paypal"]).optional(),
  sourceContext: z
    .object({
      source: z.string().min(1).max(80),
      curationId: z.string().min(1).max(120).optional(),
      sectionKey: z.enum(["d", "e", "f"]).optional(),
      stepLabel: z.enum(["Step 4", "Step 5", "Step 6"]).optional(),
    })
    .optional(),
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
  const packageConfig = (await getHireUsPackageDefinitions())[packageSlug];

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

  const sourceContext = parsed.data.sourceContext;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const isDashboardCurationFlow = sourceContext?.source === "dashboard_curation_steps" && !!sourceContext?.curationId;
  const encodedCurationId = isDashboardCurationFlow && sourceContext?.curationId
    ? encodeURIComponent(sourceContext.curationId)
    : null;
  const successPath = encodedCurationId
    ? `/dashboard/curations/${encodedCurationId}?hireUs=1&hireUsPackage=${packageSlug}`
    : `/onboarding/curation?hireUs=1&hireUsPackage=${packageSlug}`;
  const successPathWithPaid = `${successPath}${successPath.includes("?") ? "&" : "?"}paid=1`;
  const cancelUrl = encodedCurationId
    ? `${appUrl}/dashboard/curations/${encodedCurationId}`
    : `${appUrl}/onboarding/hire-us?package=${packageSlug}`;

  const stripeCustomerId = user.stripeCustomerId ? decryptField(user.stripeCustomerId) : null;
  const sourceMetadata: Record<string, string> = {};

  if (sourceContext?.source) sourceMetadata.hireUsSource = sourceContext.source;
  if (sourceContext?.curationId) sourceMetadata.hireUsSourceCurationId = sourceContext.curationId;
  if (sourceContext?.sectionKey) sourceMetadata.hireUsSourceSection = sourceContext.sectionKey;
  if (sourceContext?.stepLabel) sourceMetadata.hireUsSourceStep = sourceContext.stepLabel;

  try {
    const checkoutProvider = parsed.data.provider as ActivePaymentProvider | undefined;
    const successUrl = checkoutProvider === "stripe"
      ? `${appUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(successPathWithPaid)}`
      : `${appUrl}${successPathWithPaid}`;

    const result = await createCheckoutForActiveProvider({
      userId: session.user.id,
      planId,
      stripeCustomerId,
      successUrl,
      cancelUrl,
      provider: checkoutProvider,
      amountCentsOverride: packageConfig.priceCents,
      currencyOverride: packageConfig.currency,
      displayNameOverride: packageConfig.title,
      metadata: {
        flow: "hire_us",
        hireUsPackage: packageSlug,
        ...sourceMetadata,
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
