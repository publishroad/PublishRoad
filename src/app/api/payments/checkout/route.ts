import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";
import { decryptField } from "@/lib/server-utils";
import { z } from "zod";

const schema = z.object({ planId: z.string().min(1) });

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

  const { planId } = parsed.data;
  const userId = session.user.id;

  const [user, plan] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } }),
    db.planConfig.findUnique({ where: { id: planId, isActive: true } }),
  ]);

  if (!user || !plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!plan.stripePriceId) {
    return NextResponse.json({ error: "Plan not configured for payment" }, { status: 400 });
  }

  const stripeCustomerId = user.stripeCustomerId
    ? decryptField(user.stripeCustomerId)
    : null;

  try {
    const checkoutUrl = await createCheckoutSession({
      userId,
      planId,
      stripeCustomerId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/curation?paid=1`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/plan`,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
