import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createEntityWithRelations, resolveTagAndCategorySlugs } from "@/lib/admin/entity-relations";
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
  const { tagSlugs, categorySlugs } = await resolveTagAndCategorySlugs({ tagIds, categoryIds });

  try {
    const channel = await createEntityWithRelations({
      tagIds,
      categoryIds,
      createEntity: (tx) =>
        tx.redditChannel.create({
          data: {
            ...data,
            description: data.description || null,
            postingDifficulty: data.postingDifficulty || null,
            tagSlugs,
            categorySlugs,
          },
        }),
      createTagRelations: (tx, createdChannel, inputTagIds) =>
        tx.redditChannelTag.createMany({
          data: inputTagIds.map((tagId) => ({ redditChannelId: createdChannel.id, tagId })),
        }),
      createCategoryRelations: (tx, createdChannel, inputCategoryIds) =>
        tx.redditChannelCategory.createMany({
          data: inputCategoryIds.map((categoryId) => ({ redditChannelId: createdChannel.id, categoryId })),
        }),
    });

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
