import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const countries = await db.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, flagEmoji: true },
  });

  const worldwide = { id: "worldwide", name: "Worldwide", slug: "worldwide", flagEmoji: "🌍" };
  const response = NextResponse.json([worldwide, ...countries]);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return response;
}
