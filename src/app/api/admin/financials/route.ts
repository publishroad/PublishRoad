import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getAdminFinancials } from "@/lib/admin/financials-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const typeParam = searchParams.get("type") ?? "all";
    const statusParam = searchParams.get("status") ?? "all";
    const rawProvider = searchParams.get("provider") ?? "all";
    const providerParam = ["stripe", "paypal", "razorpay"].includes(rawProvider) ? rawProvider : "all";
    const rawGrouping = searchParams.get("chartGrouping") ?? "month";
    const chartGrouping: "month" | "year" = rawGrouping === "year" ? "year" : "month";
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const data = await getAdminFinancials({
      page,
      limit,
      typeParam,
      statusParam,
      providerParam,
      chartGrouping,
      search,
      fromParam,
      toParam,
    });

    const response = NextResponse.json(data);
    response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
    return response;
  } catch (error) {
    console.error("Admin financials API failed:", error);
    const response = NextResponse.json({ error: "Failed to load financials data" }, { status: 500 });
    response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
    return response;
  }
}
