import { NextResponse } from "next/server";
import { getHireUsPricingConfig } from "@/lib/hire-us-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const config = await getHireUsPricingConfig();
  return NextResponse.json(
    { config },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}
