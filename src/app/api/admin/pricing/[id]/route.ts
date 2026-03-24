import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  // Explicit allowlist of updatable fields
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.priceCents !== undefined) updateData.priceCents = Number(body.priceCents);
  if (body.credits !== undefined) updateData.credits = Number(body.credits);
  if (body.billingType !== undefined) updateData.billingType = body.billingType;
  if (body.stripePriceId !== undefined) updateData.stripePriceId = body.stripePriceId;
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

  await db.planConfig.update({ where: { id }, data: updateData });

  // Trigger ISR revalidation of pricing page
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
      body: JSON.stringify({ path: "/pricing" }),
    });
  } catch {
    // Non-fatal — revalidation failure shouldn't fail the update
  }

  return NextResponse.json({ success: true });
}
