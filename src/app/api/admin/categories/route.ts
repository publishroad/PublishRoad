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

  const category = await db.category.create({
    data: { name: body.name, slug: body.slug, description: body.description ?? null, isActive: true },
  });

  await invalidateLookup("categories");
  return NextResponse.json(category, { status: 201 });
}
