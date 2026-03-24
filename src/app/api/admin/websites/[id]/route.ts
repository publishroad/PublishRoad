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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = websiteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, ...data } = parsed.data;

  const website = await db.website.update({
    where: { id },
    data: {
      ...data,
      countryId: data.countryId || null,
      categoryId: data.categoryId || null,
      description: data.description || null,
    },
  });

  // Replace tags
  if (tagIds !== undefined) {
    await db.websiteTag.deleteMany({ where: { websiteId: id } });
    if (tagIds.length > 0) {
      await db.websiteTag.createMany({
        data: tagIds.map((tagId) => ({ websiteId: id, tagId })),
      });
    }
  }

  return NextResponse.json(website);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.website.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
