import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { redis } from "@/lib/redis";

const FREE_PLAN_FULL_ACCESS_KEY = "launch:free-plan:full-access";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  await db.betaConfig.upsert({
    where: { id: "default" },
    update: { enabled: body.enabled, updatedById: session.id },
    create: { id: "default", enabled: body.enabled, updatedById: session.id },
  });

  await redis.del(FREE_PLAN_FULL_ACCESS_KEY);

  return NextResponse.json({ success: true, enabled: body.enabled });
}
