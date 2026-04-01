import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { importWebsitesFromFile } from "@/lib/admin/bulk-website-import";
import { buildRateLimitIdentifiers, checkRateLimitForIdentifiers, bulkImportLimiter } from "@/lib/rate-limit";

export const maxDuration = 120;

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  if (!session?.totpVerified) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const identifiers = buildRateLimitIdentifiers(req, {
    scope: "bulk-import",
    userId: session.adminId,
  });
  const rl = await checkRateLimitForIdentifiers(bulkImportLimiter, identifiers);
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded. Please wait before importing again." }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  try {
    const { imported, processed, errors } = await importWebsitesFromFile({
      fileName: file.name,
      text: await file.text(),
    });

    return NextResponse.json({ imported, processed, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
