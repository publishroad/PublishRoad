import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/server-utils";
import { createPortalForActiveProvider, PaymentConfigurationError, UnsupportedPaymentProviderError } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const customerId = decryptField(user.stripeCustomerId);

  try {
    const portalUrl = await createPortalForActiveProvider({
      stripeCustomerId: customerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });
    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    if (error instanceof UnsupportedPaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 501 });
    }
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
