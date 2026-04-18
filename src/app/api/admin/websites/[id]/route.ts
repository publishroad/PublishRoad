import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { findWebsiteDomainConflicts } from "@/lib/admin/website-domain-duplicates";
import { websiteSchema } from "@/lib/validations/admin/website";


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = websiteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, categoryIds, countryIds, ...data } = parsed.data;

  const duplicateCheck = await findWebsiteDomainConflicts({
    url: data.url,
    excludeWebsiteId: id,
  });
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
    const website = await db.$transaction(async (tx) => {
      const updatedWebsite = await tx.website.update({
        where: { id },
        data: {
          ...data,
          countryId: primaryCountryId,
          categoryId: primaryCategoryId,
          description: data.description || null,
        },
      });

      if (tagIds !== undefined) {
        await tx.websiteTag.deleteMany({ where: { websiteId: id } });
        if (tagIds.length > 0) {
          await tx.websiteTag.createMany({ data: tagIds.map((tagId) => ({ websiteId: id, tagId })) });
        }
      }

      await tx.websiteCategory.deleteMany({ where: { websiteId: id } });
      if (categoryIds.length > 0) {
        await tx.websiteCategory.createMany({ data: categoryIds.map((categoryId) => ({ websiteId: id, categoryId })) });
      }

      await tx.websiteCountry.deleteMany({ where: { websiteId: id } });
      if (countryIds.length > 0) {
        await tx.websiteCountry.createMany({ data: countryIds.map((countryId) => ({ websiteId: id, countryId })) });
      }

      return updatedWebsite;
    });

    return NextResponse.json(website);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Website not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "A website with this URL already exists" }, { status: 409 });
      }
    }

    console.error("Website update failed:", error);
    return NextResponse.json({ error: "Failed to update website" }, { status: 500 });
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
    await db.website.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Website not found" }, { status: 404 });
      }

      if (error.code === "P2003") {
        await db.website.update({
          where: { id },
          data: { isActive: false, isExcluded: true, starRating: null },
        });

        return NextResponse.json({
          success: false,
          deleted: false,
          archived: true,
          action: "archived_not_deleted",
          message: "Website is linked to existing curation records, so it was archived instead.",
        });
      }
    }

    console.error("Website delete failed:", error);
    return NextResponse.json({ error: "Failed to delete website" }, { status: 500 });
  }
}
