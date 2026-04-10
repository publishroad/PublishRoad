import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createEntityWithRelations, resolveTagAndCategorySlugs } from "@/lib/admin/entity-relations";
import { fundSchema } from "@/lib/validations/admin/fund";


export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = fundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, categoryIds, ...data } = parsed.data;
  const { tagSlugs, categorySlugs } = await resolveTagAndCategorySlugs({ tagIds, categoryIds });

  const fund = await createEntityWithRelations({
    tagIds,
    categoryIds,
    createEntity: (tx) =>
      tx.fund.create({
        data: {
          ...data,
          logoUrl: data.logoUrl || null,
          countryId: data.countryId || null,
          description: data.description || null,
          investmentStage: data.investmentStage || null,
          ticketSize: data.ticketSize || null,
          tagSlugs,
          categorySlugs,
        },
      }),
    createTagRelations: (tx, createdFund, inputTagIds) =>
      tx.fundTag.createMany({
        data: inputTagIds.map((tagId) => ({ fundId: createdFund.id, tagId })),
      }),
    createCategoryRelations: (tx, createdFund, inputCategoryIds) =>
      tx.fundCategory.createMany({
        data: inputCategoryIds.map((categoryId) => ({ fundId: createdFund.id, categoryId })),
      }),
  });

  return NextResponse.json(fund, { status: 201 });
}
