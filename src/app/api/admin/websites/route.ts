import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { findWebsiteDomainConflicts } from "@/lib/admin/website-domain-duplicates";
import { websiteSchema } from "@/lib/validations/admin/website";


export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = websiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, categoryIds, countryIds, ...data } = parsed.data;

  const duplicateCheck = await findWebsiteDomainConflicts({ url: data.url });
  if (duplicateCheck.conflicts.length > 0) {
    return NextResponse.json(
      {
        error: "This domain already exists in the distribution list.",
        duplicateDomain: duplicateCheck.domain,
        conflicts: duplicateCheck.conflicts,
      },
      { status: 409 }
    );
  }

  // categoryId kept for curation backward compat — set to first selection
  const primaryCategoryId = categoryIds[0] ?? null;
  // countryId kept for curation scoring backward compat — set to first selection
  const primaryCountryId = countryIds[0] ?? null;

  try {
    const website = await db.website.create({
      data: {
        ...data,
        countryId: primaryCountryId,
        categoryId: primaryCategoryId,
        description: data.description || null,
      },
    });

    await Promise.all([
      tagIds.length > 0
        ? db.websiteTag.createMany({ data: tagIds.map((tagId) => ({ websiteId: website.id, tagId })) })
        : Promise.resolve(),
      categoryIds.length > 0
        ? db.websiteCategory.createMany({ data: categoryIds.map((categoryId) => ({ websiteId: website.id, categoryId })) })
        : Promise.resolve(),
    ]);

    return NextResponse.json(website, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A website with this URL already exists" }, { status: 409 });
    }

    console.error("Website create failed:", error);
    return NextResponse.json({ error: "Failed to create website" }, { status: 500 });
  }
}
