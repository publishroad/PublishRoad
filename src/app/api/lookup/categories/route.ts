import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const response = NextResponse.json(categories);
  // Always fetch latest lookup values from DB.
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
