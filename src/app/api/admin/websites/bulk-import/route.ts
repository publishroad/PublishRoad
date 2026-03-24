import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { bulkImportRowSchema } from "@/lib/validations/admin/website";
import { slugify } from "@/lib/utils";
import { checkRateLimit, bulkImportLimiter } from "@/lib/rate-limit";

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

  // Rate limit: 1 bulk import per 5 min
  const rl = await checkRateLimit(bulkImportLimiter, session.adminId);
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

  const text = await file.text();
  const errors: Array<{ row: number; message: string }> = [];
  const rows: Array<Record<string, unknown>> = [];

  // Parse CSV or JSON
  if (file.name.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return NextResponse.json({ error: "JSON must be an array" }, { status: 400 });
      }
      rows.push(...parsed);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  } else {
    // CSV parsing
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header and at least one row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => { row[h] = values[j] ?? ""; });
      rows.push(row);
    }
  }

  let imported = 0;

  // Fetch lookup data
  const [countries, categories, tags] = await Promise.all([
    db.country.findMany({ select: { id: true, slug: true } }),
    db.category.findMany({ select: { id: true, slug: true } }),
    db.tag.findMany({ select: { id: true, slug: true } }),
  ]);

  const countryMap = Object.fromEntries(countries.map((c) => [c.slug, c.id]));
  const categoryMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const tagMap = Object.fromEntries(tags.map((t) => [t.slug, t.id]));

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-indexed, +1 for header
    const parsed = bulkImportRowSchema.safeParse(rows[i]);

    if (!parsed.success) {
      errors.push({
        row: rowNum,
        message: parsed.error.issues.map((e) => e.message).join(", "),
      });
      continue;
    }

    const row = parsed.data;

    try {
      const countryId = row.country_slug ? (countryMap[row.country_slug] ?? null) : null;
      const categoryId = row.category_slug ? (categoryMap[row.category_slug] ?? null) : null;

      const website = await db.website.upsert({
        where: { url: row.url },
        create: {
          name: row.name,
          url: row.url,
          type: row.type,
          da: row.da,
          pa: row.pa,
          spamScore: row.spam_score,
          traffic: row.traffic,
          description: row.description ?? null,
          countryId,
          categoryId,
          isActive: true,
          isPinned: false,
          isExcluded: false,
        },
        update: {
          name: row.name,
          type: row.type,
          da: row.da,
          pa: row.pa,
          spamScore: row.spam_score,
          traffic: row.traffic,
          description: row.description ?? null,
          countryId,
          categoryId,
        },
      });

      // Handle tags (already string[] after schema transform)
      if (row.tags && row.tags.length > 0) {
        const tagIds = row.tags
          .map((slug: string) => tagMap[slug])
          .filter(Boolean);

        if (tagIds.length > 0) {
          await db.websiteTag.deleteMany({ where: { websiteId: website.id } });
          await db.websiteTag.createMany({
            data: tagIds.map((tagId: string) => ({ websiteId: website.id, tagId })),
          });
        }
      }

      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ imported, errors });
}
