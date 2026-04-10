import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createEntityWithRelations, resolveTagAndCategorySlugs } from "@/lib/admin/entity-relations";
import { influencerSchema } from "@/lib/validations/admin/influencer";


export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = influencerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, categoryIds, ...data } = parsed.data;
  const { tagSlugs, categorySlugs } = await resolveTagAndCategorySlugs({ tagIds, categoryIds });

  const influencer = await createEntityWithRelations({
    tagIds,
    categoryIds,
    createEntity: (tx) =>
      tx.influencer.create({
        data: {
          ...data,
          email: data.email || null,
          countryId: data.countryId || null,
          description: data.description || null,
          tagSlugs,
          categorySlugs,
        },
      }),
    createTagRelations: (tx, createdInfluencer, inputTagIds) =>
      tx.influencerTag.createMany({
        data: inputTagIds.map((tagId) => ({ influencerId: createdInfluencer.id, tagId })),
      }),
    createCategoryRelations: (tx, createdInfluencer, inputCategoryIds) =>
      tx.influencerCategory.createMany({
        data: inputCategoryIds.map((categoryId) => ({ influencerId: createdInfluencer.id, categoryId })),
      }),
  });

  return NextResponse.json(influencer, { status: 201 });
}
