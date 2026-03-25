import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
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

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const fund = await db.fund.create({
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

  await Promise.all([
    tagIds.length > 0
      ? db.fundTag.createMany({ data: tagIds.map((tagId) => ({ fundId: fund.id, tagId })) })
      : Promise.resolve(),
    categoryIds.length > 0
      ? db.fundCategory.createMany({ data: categoryIds.map((categoryId) => ({ fundId: fund.id, categoryId })) })
      : Promise.resolve(),
  ]);

  return NextResponse.json(fund, { status: 201 });
}
