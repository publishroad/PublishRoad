import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const plans = await db.planConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const response = NextResponse.json(plans);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return response;
}
