import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { verifyAdminSession } from "@/lib/admin-auth";
import { websiteSchema } from "@/lib/validations/admin/website";

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
  const parsed = websiteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { tagIds, ...data } = parsed.data;

  try {
    const website = await db.$transaction(async (tx) => {
      const updatedWebsite = await tx.website.update({
        where: { id },
        data: {
          ...data,
          countryId: data.countryId || null,
          categoryId: data.categoryId || null,
          description: data.description || null,
        },
      });

      if (tagIds !== undefined) {
        await tx.websiteTag.deleteMany({ where: { websiteId: id } });
        if (tagIds.length > 0) {
          await tx.websiteTag.createMany({
            data: tagIds.map((tagId) => ({ websiteId: id, tagId })),
          });
        }
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

      // Website is referenced by historical records (e.g., curation results).
      // Fall back to archival so users can still remove it from active usage.
      if (error.code === "P2003") {
        await db.website.update({
          where: { id },
          data: {
            isActive: false,
            isExcluded: true,
            isPinned: false,
          },
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
