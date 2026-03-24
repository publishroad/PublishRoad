import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { websiteSchema } from "@/lib/validations/admin/website";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  if (!session?.totpVerified) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = websiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, ...data } = parsed.data;

  const website = await db.website.create({
    data: {
      ...data,
      countryId: data.countryId || null,
      categoryId: data.categoryId || null,
      description: data.description || null,
    },
  });

  // Update tags
  if (tagIds && tagIds.length > 0) {
    await db.websiteTag.createMany({
      data: tagIds.map((tagId) => ({ websiteId: website.id, tagId })),
    });
  }

  return NextResponse.json(website, { status: 201 });
}
