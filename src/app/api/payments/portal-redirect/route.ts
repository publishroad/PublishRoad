import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPortalSession } from "@/lib/stripe";
import { decryptField } from "@/lib/server-utils";

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

  const customerId = decryptField(user.stripeCustomerId);
  const portalUrl = await createPortalSession(
    customerId,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
  );

  return NextResponse.redirect(portalUrl);
}
