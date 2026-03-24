import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { invalidateLookup } from "@/lib/cache";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ error: "Name and slug required" }, { status: 422 });
  }

  const country = await db.country.create({
    data: { name: body.name, slug: body.slug, flagEmoji: body.flagEmoji ?? null, isActive: true },
  });

  await invalidateLookup("countries");
  return NextResponse.json(country, { status: 201 });
}
