import { Prisma, type WebsiteType } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { bulkImportRowSchema } from "@/lib/validations/admin/website";

export type BulkImportError = {
  row: number;
  message: string;
};

type ImportSourceRow = Record<string, unknown>;

type PreparedImportRow = {
  name: string;
  url: string;
  type: WebsiteType;
  da: number;
  pa: number;
  spamScore: number;
  traffic: number;
  description: string | null | undefined;
  countryId: string | null;
  categoryId: string | null;
  tagSlugs: string[];
  tagIds: string[];
};

type ImportLookupMaps = {
  countryMap: Record<string, string>;
  categoryMap: Record<string, string>;
  tagMap: Record<string, string>;
};

function buildWebsiteUpdateValues(rows: PreparedImportRow[]) {
  return Prisma.join(
    rows.map((row) =>
      Prisma.sql`(
        CAST(${row.url} AS text),
        CAST(${row.name} AS text),
        CAST(${row.type} AS "WebsiteType"),
        CAST(${row.da} AS integer),
        CAST(${row.pa} AS integer),
        CAST(${row.spamScore} AS integer),
        CAST(${row.traffic} AS integer),
        CAST(${row.description ?? null} AS text),
        CAST(${row.countryId} AS uuid),
        CAST(${row.categoryId} AS uuid),
        CAST(${row.tagSlugs} AS text[])
      )`
    )
  );
}

function normalizeLookupValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return slugify(value);
}

function normalizeTagSlugs(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => slugify(tag))
        .filter(Boolean)
    )
  );
}

function parseImportFile(fileName: string, text: string): ImportSourceRow[] {
  if (fileName.endsWith(".json")) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON must be an array");
    }

    return parsed as ImportSourceRow[];
  }

  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have a header and at least one row");
  }

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

async function getImportLookupMaps(): Promise<ImportLookupMaps> {
  const [countries, categories, tags] = await Promise.all([
    db.country.findMany({ select: { id: true, slug: true } }),
    db.category.findMany({ select: { id: true, slug: true } }),
    db.tag.findMany({ select: { id: true, slug: true } }),
  ]);

  return {
    countryMap: Object.fromEntries(countries.map((country) => [country.slug, country.id])),
    categoryMap: Object.fromEntries(categories.map((category) => [category.slug, category.id])),
    tagMap: Object.fromEntries(tags.map((tag) => [tag.slug, tag.id])),
  };
}

async function prepareImportRows(rawRows: ImportSourceRow[], rowOffset: number) {
  const errors: BulkImportError[] = [];
  const preparedRows: PreparedImportRow[] = [];
  const lookupMaps = await getImportLookupMaps();

  for (let index = 0; index < rawRows.length; index += 1) {
    const rowNum = index + rowOffset;
    const parsed = bulkImportRowSchema.safeParse(rawRows[index]);

    if (!parsed.success) {
      errors.push({
        row: rowNum,
        message: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
      continue;
    }

    const row = parsed.data;
    const countrySlug = normalizeLookupValue(row.country_slug);
    const categorySlug = normalizeLookupValue(row.category_slug);
    const tagSlugs = normalizeTagSlugs(row.tags ?? []);

    preparedRows.push({
      name: row.name,
      url: row.url,
      type: row.type,
      da: row.da,
      pa: row.pa,
      spamScore: row.spam_score,
      traffic: row.traffic,
      description: row.description ?? null,
      countryId: countrySlug ? (lookupMaps.countryMap[countrySlug] ?? null) : null,
      categoryId: categorySlug ? (lookupMaps.categoryMap[categorySlug] ?? null) : null,
      tagSlugs,
      tagIds: tagSlugs
        .map((tagSlug) => lookupMaps.tagMap[tagSlug])
        .filter((tagId): tagId is string => Boolean(tagId)),
    });
  }

  return { errors, preparedRows };
}

async function writeImportedWebsites(preparedRows: PreparedImportRow[]) {
  const latestRowsByUrl = new Map<string, PreparedImportRow>();
  for (const row of preparedRows) {
    latestRowsByUrl.set(row.url, row);
  }

  const uniqueRows = Array.from(latestRowsByUrl.values());
  const existingWebsites = await db.website.findMany({
    where: { url: { in: uniqueRows.map((row) => row.url) } },
    select: { id: true, url: true },
  });

  const existingWebsiteIds = new Map(existingWebsites.map((website) => [website.url, website.id]));
  const rowsToCreate = uniqueRows.filter((row) => !existingWebsiteIds.has(row.url));
  const rowsToUpdate = uniqueRows.filter((row) => existingWebsiteIds.has(row.url));

  return db.$transaction(async (tx) => {
    let createdCount = 0;
    let updatedCount = 0;

    // Track newly created websites for tag management
    const newlyCreatedWebsites: Map<string, string> = new Map();

    if (rowsToCreate.length > 0) {
      // Use INSERT with RETURNING to get IDs immediately
      const createValues = Prisma.join(
        rowsToCreate.map((row) =>
          Prisma.sql`(
            ${row.name},
            ${row.url},
            CAST(${row.type} AS "WebsiteType"),
            ${row.da},
            ${row.pa},
            ${row.spamScore},
            ${row.traffic},
            ${row.description ?? null},
            ${row.countryId},
            ${row.categoryId},
            ${row.tagSlugs},
            true,
            false,
            false,
            NOW(),
            NOW()
          )`
        )
      );

      const created = await tx.$queryRaw<Array<{ id: string; url: string }>>`
        INSERT INTO "websites" (
          "name", "url", "type", "da", "pa", "spam_score", "traffic", 
          "description", "country_id", "category_id", "tag_slugs",
          "is_active", "is_pinned", "is_excluded", "created_at", "updated_at"
        )
        VALUES ${createValues}
        ON CONFLICT ("url") DO NOTHING
        RETURNING "id", "url"
      `;

      createdCount = created.length;
      created.forEach((website) => {
        newlyCreatedWebsites.set(website.url, website.id);
      });
    }

    if (rowsToUpdate.length > 0) {
      updatedCount = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "websites" AS w
          SET
            "name" = data.name,
            "type" = data.type::"WebsiteType",
            "da" = data.da,
            "pa" = data.pa,
            "spam_score" = data.spam_score,
            "traffic" = data.traffic,
            "description" = data.description,
            "country_id" = data.country_id,
            "category_id" = data.category_id,
            "tag_slugs" = data.tag_slugs,
            "updated_at" = NOW()
          FROM (
            VALUES ${buildWebsiteUpdateValues(rowsToUpdate)}
          ) AS data(url, name, type, da, pa, spam_score, traffic, description, country_id, category_id, tag_slugs)
          WHERE w."url" = data.url
        `
      );
    }

    // Combine maps from existing and newly created websites
    const websiteIdsByUrl = new Map<string, string>(existingWebsiteIds);
    newlyCreatedWebsites.forEach((id, url) => {
      websiteIdsByUrl.set(url, id);
    });

    const managedWebsiteIds = Array.from(websiteIdsByUrl.values());

    if (managedWebsiteIds.length > 0) {
      const desiredTagIdsByWebsite = new Map<string, Set<string>>();

      for (const row of uniqueRows) {
        const websiteId = websiteIdsByUrl.get(row.url);
        if (!websiteId) {
          continue;
        }
        desiredTagIdsByWebsite.set(websiteId, new Set(row.tagIds));
      }

      const existingWebsiteTags = await tx.websiteTag.findMany({
        where: { websiteId: { in: managedWebsiteIds } },
        select: { websiteId: true, tagId: true },
      });

      const existingTagIdsByWebsite = new Map<string, Set<string>>();
      for (const { websiteId, tagId } of existingWebsiteTags) {
        if (!existingTagIdsByWebsite.has(websiteId)) {
          existingTagIdsByWebsite.set(websiteId, new Set());
        }
        existingTagIdsByWebsite.get(websiteId)?.add(tagId);
      }

      const deleteOps: Array<Promise<unknown>> = [];
      const websiteTagsToCreate: Array<{ websiteId: string; tagId: string }> = [];

      for (const websiteId of managedWebsiteIds) {
        const desiredTagIds = desiredTagIdsByWebsite.get(websiteId) ?? new Set<string>();
        const existingTagIds = existingTagIdsByWebsite.get(websiteId) ?? new Set<string>();

        const tagIdsToDelete = Array.from(existingTagIds).filter((tagId) => !desiredTagIds.has(tagId));
        const tagIdsToCreate = Array.from(desiredTagIds).filter((tagId) => !existingTagIds.has(tagId));

        if (tagIdsToDelete.length > 0) {
          deleteOps.push(
            tx.websiteTag.deleteMany({
              where: {
                websiteId,
                tagId: { in: tagIdsToDelete },
              },
            })
          );
        }

        for (const tagId of tagIdsToCreate) {
          websiteTagsToCreate.push({ websiteId, tagId });
        }
      }

      if (deleteOps.length > 0) {
        await Promise.all(deleteOps);
      }

      if (websiteTagsToCreate.length > 0) {
        await tx.websiteTag.createMany({
          data: websiteTagsToCreate,
          skipDuplicates: true,
        });
      }
    }

    return { processed: createdCount + updatedCount };
  });
}

export async function importWebsitesFromFile({
  fileName,
  text,
}: {
  fileName: string;
  text: string;
}) {
  const rows = parseImportFile(fileName, text);
  const rowOffset = fileName.endsWith(".json") ? 1 : 2;
  const { errors, preparedRows } = await prepareImportRows(rows, rowOffset);

  if (preparedRows.length === 0) {
    return { errors, imported: 0, processed: 0 };
  }

  const { processed } = await writeImportedWebsites(preparedRows);
  return { errors, imported: processed, processed };
}
