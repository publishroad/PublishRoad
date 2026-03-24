import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { invalidateUserProfile } from "@/lib/cache";

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

  // Explicit allowlist
  const updateData: Record<string, unknown> = {};
  if (body.planId !== undefined) updateData.planId = body.planId;
  if (body.creditsRemaining !== undefined) updateData.creditsRemaining = Number(body.creditsRemaining);

  await db.user.update({ where: { id }, data: updateData });
  await invalidateUserProfile(id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Hard delete for admin-initiated account deletion
  await db.user.delete({ where: { id } });
  await invalidateUserProfile(id);

  return NextResponse.json({ success: true });
}
