import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const plans = await db.planConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const response = NextResponse.json(plans);
  // Static pricing catalog: cache aggressively with SWR.
  response.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
  );
  return response;
}
