import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 300;

export async function GET() {
  const plans = await db.planConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const response = NextResponse.json(plans);
  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return response;
}
