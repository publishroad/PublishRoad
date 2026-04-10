import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateLookup } from "@/lib/cache";


export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ error: "Name and slug required" }, { status: 422 });
  }

  const tag = await db.tag.create({
    data: { name: body.name, slug: body.slug, isActive: true },
  });

  await invalidateLookup("tags");
  return NextResponse.json(tag, { status: 201 });
}
