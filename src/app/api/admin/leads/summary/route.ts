import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";


export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const newCount = await db.serviceLead.count({
    where: { status: "new" },
  });

  return NextResponse.json({ newCount });
}
