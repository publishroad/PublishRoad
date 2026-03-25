import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
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
    const channel = await db.$transaction(async (tx) => {
      const updated = await tx.redditChannel.update({
        where: { id },
        data: {
          ...data,
          description: data.description || null,
          postingDifficulty: data.postingDifficulty || null,
          tagSlugs: tags.map((t) => t.slug),
          categorySlugs: categories.map((c) => c.slug),
        },
      });

      await tx.redditChannelTag.deleteMany({ where: { redditChannelId: id } });
      await tx.redditChannelCategory.deleteMany({ where: { redditChannelId: id } });

      if (tagIds.length > 0) {
        await tx.redditChannelTag.createMany({ data: tagIds.map((tagId) => ({ redditChannelId: id, tagId })) });
      }
      if (categoryIds.length > 0) {
        await tx.redditChannelCategory.createMany({ data: categoryIds.map((categoryId) => ({ redditChannelId: id, categoryId })) });
      }

      return updated;
    });

    return NextResponse.json(channel);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Reddit channel not found" }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ error: "A subreddit with this URL already exists" }, { status: 409 });
    }
    console.error("Reddit channel update failed:", error);
    return NextResponse.json({ error: "Failed to update reddit channel" }, { status: 500 });
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
    await db.redditChannel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Reddit channel not found" }, { status: 404 });
    }
    console.error("Reddit channel delete failed:", error);
    return NextResponse.json({ error: "Failed to delete reddit channel" }, { status: 500 });
  }
}
