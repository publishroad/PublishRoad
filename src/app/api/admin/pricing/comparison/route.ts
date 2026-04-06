import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";
import {
  normalizePricingComparisonRows,
  PricingComparisonRow,
} from "@/lib/pricing-comparison";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { rows?: unknown } | null;
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Invalid rows payload" }, { status: 422 });
  }

  const normalizedRows = normalizePricingComparisonRows(body.rows);
  const rowsJson = JSON.stringify(normalizedRows);

  try {
    // Self-heal for environments where migration hasn't been applied yet.
    await db.$executeRaw`
      ALTER TABLE "beta_config"
      ADD COLUMN IF NOT EXISTS "pricing_comparison_rows" JSONB NOT NULL DEFAULT '[]'::jsonb
    `;

    await db.$executeRaw(
      Prisma.sql`
        INSERT INTO "beta_config" ("id", "enabled", "pricing_comparison_rows", "updated_by_id", "updated_at")
        VALUES ('default', false, CAST(${rowsJson} AS jsonb), ${session.adminId}, NOW())
        ON CONFLICT ("id") DO UPDATE
        SET
          "pricing_comparison_rows" = CAST(${rowsJson} AS jsonb),
          "updated_by_id" = ${session.adminId},
          "updated_at" = NOW()
      `
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to save comparison table. Please run database migrations and try again." },
      { status: 500 }
    );
  }

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
      body: JSON.stringify({ path: "/pricing" }),
    });
  } catch {
    // Non-fatal: comparison config save should still succeed.
  }

  return NextResponse.json({ success: true, rows: normalizedRows as PricingComparisonRow[] });
}
