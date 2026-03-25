import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { verifyAdminSession } from "@/lib/admin-auth";
import { fundSchema } from "@/lib/validations/admin/fund";

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
  const parsed = fundSchema.safeParse(body);
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
    const fund = await db.$transaction(async (tx) => {
      const updated = await tx.fund.update({
        where: { id },
        data: {
          ...data,
          logoUrl: data.logoUrl || null,
          countryId: data.countryId || null,
          description: data.description || null,
          investmentStage: data.investmentStage || null,
          ticketSize: data.ticketSize || null,
          tagSlugs: tags.map((t) => t.slug),
          categorySlugs: categories.map((c) => c.slug),
        },
      });

      await tx.fundTag.deleteMany({ where: { fundId: id } });
      await tx.fundCategory.deleteMany({ where: { fundId: id } });

      if (tagIds.length > 0) {
        await tx.fundTag.createMany({ data: tagIds.map((tagId) => ({ fundId: id, tagId })) });
      }
      if (categoryIds.length > 0) {
        await tx.fundCategory.createMany({ data: categoryIds.map((categoryId) => ({ fundId: id, categoryId })) });
      }

      return updated;
    });

    return NextResponse.json(fund);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }
    console.error("Fund update failed:", error);
    return NextResponse.json({ error: "Failed to update fund" }, { status: 500 });
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
    await db.fund.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }
    console.error("Fund delete failed:", error);
    return NextResponse.json({ error: "Failed to delete fund" }, { status: 500 });
  }
}
