import { NextResponse } from "next/server";
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

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const newCount = await db.serviceLead.count({
    where: { status: "new" },
  });

  return NextResponse.json({ newCount });
}
