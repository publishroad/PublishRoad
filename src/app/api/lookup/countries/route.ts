import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 300;

export async function GET() {
  const countries = await db.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, flagEmoji: true },
  });

  const worldwide = { id: "worldwide", name: "Worldwide", slug: "worldwide", flagEmoji: "🌍" };
  const response = NextResponse.json([worldwide, ...countries]);
  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return response;
}
