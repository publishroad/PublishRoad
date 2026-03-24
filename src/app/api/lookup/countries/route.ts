import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const countries = await db.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, flagEmoji: true },
  });

  const response = NextResponse.json(countries);
  // Static lookup data: long-lived browser/proxy cache.
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
  );
  return response;
}
