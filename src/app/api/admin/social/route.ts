import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
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

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const influencer = await db.influencer.create({
    data: {
      ...data,
      email: data.email || null,
      countryId: data.countryId || null,
      description: data.description || null,
      tagSlugs: tags.map((t) => t.slug),
      categorySlugs: categories.map((c) => c.slug),
    },
  });

  await Promise.all([
    tagIds.length > 0
      ? db.influencerTag.createMany({ data: tagIds.map((tagId) => ({ influencerId: influencer.id, tagId })) })
      : Promise.resolve(),
    categoryIds.length > 0
      ? db.influencerCategory.createMany({ data: categoryIds.map((categoryId) => ({ influencerId: influencer.id, categoryId })) })
      : Promise.resolve(),
  ]);

  return NextResponse.json(influencer, { status: 201 });
}
