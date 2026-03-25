import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { verifyAdminSession } from "@/lib/admin-auth";
import { influencerSchema } from "@/lib/validations/admin/influencer";

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
  const parsed = influencerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, categoryIds, ...data } = parsed.data;

  const [tags, categories] = await Promise.all([
    tagIds.length > 0
      ? db.tag.findMany({ where: { id: { in: tagIds } }, select: { slug: true } })
      : Promise.resolve([]),
    categoryIds.length > 0
      ? db.category.findMany({ where: { id: { in: categoryIds } }, select: { slug: true } })
      : Promise.resolve([]),
  ]);

  try {
    const influencer = await db.$transaction(async (tx) => {
      const updated = await tx.influencer.update({
        where: { id },
        data: {
          ...data,
          email: data.email || null,
          countryId: data.countryId || null,
          description: data.description || null,
          tagSlugs: tags.map((t) => t.slug),
          categorySlugs: categories.map((c) => c.slug),
        },
      });

      await tx.influencerTag.deleteMany({ where: { influencerId: id } });
      await tx.influencerCategory.deleteMany({ where: { influencerId: id } });

      if (tagIds.length > 0) {
        await tx.influencerTag.createMany({ data: tagIds.map((tagId) => ({ influencerId: id, tagId })) });
      }
      if (categoryIds.length > 0) {
        await tx.influencerCategory.createMany({ data: categoryIds.map((categoryId) => ({ influencerId: id, categoryId })) });
      }

      return updated;
    });

    return NextResponse.json(influencer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }
    console.error("Influencer update failed:", error);
    return NextResponse.json({ error: "Failed to update influencer" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await db.influencer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }
    console.error("Influencer delete failed:", error);
    return NextResponse.json({ error: "Failed to delete influencer" }, { status: 500 });
  }
}
