import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/server-utils";
import { createPortalForActiveProvider, PaymentConfigurationError, UnsupportedPaymentProviderError } from "@/lib/payments/service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.redirect(new URL("/dashboard/billing", req.url));
  }

  try {
    const customerId = decryptField(user.stripeCustomerId);
    const portalUrl = await createPortalForActiveProvider({
      stripeCustomerId: customerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });

    return NextResponse.redirect(portalUrl);
  } catch (error) {
    if (error instanceof UnsupportedPaymentProviderError) {
      return NextResponse.redirect(new URL("/dashboard/billing?gateway=unsupported", req.url));
    }
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.redirect(new URL("/dashboard/billing?gateway=misconfigured", req.url));
    }

    return NextResponse.redirect(new URL("/dashboard/billing?gateway=error", req.url));
  }
}
