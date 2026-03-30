import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const countries = await db.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, flagEmoji: true },
  });

  const worldwide = { id: "worldwide", name: "Worldwide", slug: "worldwide", flagEmoji: "🌍" };
  const response = NextResponse.json([worldwide, ...countries]);
  // Always fetch latest lookup values from DB.
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
