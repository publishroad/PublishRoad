import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { redditChannelSchema } from "@/lib/validations/admin/reddit-channel";

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
  const parsed = redditChannelSchema.safeParse(body);
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
    const channel = await db.redditChannel.create({
      data: {
        ...data,
        description: data.description || null,
        postingDifficulty: data.postingDifficulty || null,
        tagSlugs: tags.map((t) => t.slug),
        categorySlugs: categories.map((c) => c.slug),
      },
    });

    await Promise.all([
      tagIds.length > 0
        ? db.redditChannelTag.createMany({ data: tagIds.map((tagId) => ({ redditChannelId: channel.id, tagId })) })
        : Promise.resolve(),
      categoryIds.length > 0
        ? db.redditChannelCategory.createMany({ data: categoryIds.map((categoryId) => ({ redditChannelId: channel.id, categoryId })) })
        : Promise.resolve(),
    ]);

    return NextResponse.json(channel, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2002") {
      return NextResponse.json({ error: "A subreddit with this URL already exists" }, { status: 409 });
    }
    console.error("Reddit channel create failed:", error);
    return NextResponse.json({ error: "Failed to create reddit channel" }, { status: 500 });
  }
}
