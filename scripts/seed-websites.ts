#!/usr/bin/env tsx
/**
 * Seed websites from a CSV or JSON file.
 *
 * Usage:
 *   npx tsx scripts/seed-websites.ts ./websites.csv
 *   npx tsx scripts/seed-websites.ts ./websites.json
 *
 * CSV column format (header row required):
 *   name, url, type, da, country_slug, category_slug, tags, description
 *
 * JSON format: array of objects with the same keys.
 *
 * type must be one of: distribution | guest_post | press_release
 * da: integer 0-100
 * tags: pipe-separated tag slugs e.g. "tech|startup|saas"
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
type PrismaClientType = InstanceType<typeof PrismaClient>;
import { readFileSync } from "fs";
import { z } from "zod";
import * as path from "path";

const db: PrismaClientType = new PrismaClient();

const rowSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  type: z.enum(["distribution", "guest_post", "press_release"]),
  da: z.coerce.number().int().min(0).max(100).default(0),
  country_slug: z.string().optional().default(""),
  category_slug: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/seed-websites.ts <file.csv|file.json>");
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  const text = readFileSync(absPath, "utf-8");
  const isJson = filePath.endsWith(".json");

  let rawRows: Record<string, string>[];

  if (isJson) {
    rawRows = JSON.parse(text);
  } else {
    const lines = text.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    rawRows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    });
  }

  console.log(`📂 Loaded ${rawRows.length} rows from ${absPath}`);

  // Prefetch lookup tables
  const [countries, categories, tags] = await Promise.all([
    db.country.findMany({ select: { id: true, slug: true } }),
    db.category.findMany({ select: { id: true, slug: true } }),
    db.tag.findMany({ select: { id: true, slug: true } }),
  ]);

  const countryMap = Object.fromEntries(countries.map((c: { slug: string; id: string }) => [c.slug, c.id]));
  const categoryMap = Object.fromEntries(categories.map((c: { slug: string; id: string }) => [c.slug, c.id]));
  const tagMap = Object.fromEntries(tags.map((t: { slug: string; id: string }) => [t.slug, t.id]));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const parsed = rowSchema.safeParse(rawRows[i]);

    if (!parsed.success) {
      const msg = `Row ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(", ")}`;
      errors.push(msg);
      skipped++;
      continue;
    }

    const row = parsed.data;

    try {
      const website = await db.website.upsert({
        where: { url: row.url },
        create: {
          name: row.name,
          url: row.url,
          type: row.type,
          da: row.da,
          description: row.description || null,
          countryId: row.country_slug ? (countryMap[row.country_slug] ?? null) : null,
          categoryId: row.category_slug ? (categoryMap[row.category_slug] ?? null) : null,
          isActive: true,
          isPinned: false,
          isExcluded: false,
        },
        update: {
          name: row.name,
          type: row.type,
          da: row.da,
          description: row.description || null,
          countryId: row.country_slug ? (countryMap[row.country_slug] ?? null) : null,
          categoryId: row.category_slug ? (categoryMap[row.category_slug] ?? null) : null,
        },
      });

      if (row.tags) {
        const tagSlugs = row.tags.split("|").map((t) => t.trim().toLowerCase()).filter(Boolean);
        const tagIds = tagSlugs.map((slug) => tagMap[slug]).filter(Boolean);

        if (tagIds.length > 0) {
          await db.websiteTag.deleteMany({ where: { websiteId: website.id } });
          await db.websiteTag.createMany({
            data: tagIds.map((tagId) => ({ websiteId: website.id, tagId })),
          });
        }
      }

      imported++;
      if (imported % 100 === 0) {
        process.stdout.write(`\r⏳ Imported ${imported}/${rawRows.length}...`);
      }
    } catch (err) {
      const msg = `Row ${i + 2} (${row.url}): ${err instanceof Error ? err.message : "Unknown error"}`;
      errors.push(msg);
      skipped++;
    }
  }

  console.log(`\n\n✅ Import complete: ${imported} imported, ${skipped} skipped`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach((e) => console.log(` - ${e}`));
  }
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
