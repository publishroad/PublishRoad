import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 300;

export async function GET() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const response = NextResponse.json(categories);
  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return response;
}
