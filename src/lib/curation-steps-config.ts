import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ALL_CURATION_SECTIONS,
  type CurationSectionKey,
  normalizeEnabledCurationSections,
} from "@/lib/curation-sections";

export { ALL_CURATION_SECTIONS, normalizeEnabledCurationSections };
export type { CurationSectionKey };

function sectionsArraySql(sections: CurationSectionKey[]) {
  return Prisma.sql`ARRAY[${Prisma.join(sections.map((section) => Prisma.sql`${section}`))}]::text[]`;
}

export async function getGlobalEnabledCurationSections(): Promise<CurationSectionKey[]> {
  try {
    const rows = await db.$queryRaw<Array<{ curation_enabled_sections: string[] | null }>>`
      SELECT curation_enabled_sections
      FROM beta_config
      WHERE id = 'default'
      LIMIT 1
    `;

    return normalizeEnabledCurationSections(rows[0]?.curation_enabled_sections ?? null);
  } catch {
    return [...ALL_CURATION_SECTIONS];
  }
}

export async function setGlobalEnabledCurationSections(args: {
  sections: CurationSectionKey[];
  adminId: string;
}): Promise<void> {
  const normalizedSections = normalizeEnabledCurationSections(args.sections);
  const sectionsSql = sectionsArraySql(normalizedSections);

  await db.$executeRaw`
    ALTER TABLE "beta_config"
    ADD COLUMN IF NOT EXISTS "curation_enabled_sections" TEXT[] NOT NULL DEFAULT ARRAY['a','b','c','d','e','f']::text[]
  `;

  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "beta_config" ("id", "enabled", "curation_enabled_sections", "updated_by_id", "updated_at")
      VALUES ('default', false, ${sectionsSql}, ${args.adminId}, NOW())
      ON CONFLICT ("id") DO UPDATE
      SET
        "curation_enabled_sections" = ${sectionsSql},
        "updated_by_id" = ${args.adminId},
        "updated_at" = NOW()
    `
  );
}

export async function getCurationEnabledSectionsSnapshot(curationId: string): Promise<CurationSectionKey[]> {
  try {
    const rows = await db.$queryRaw<Array<{ enabled_sections: string[] | null }>>`
      SELECT enabled_sections
      FROM curations
      WHERE id::text = ${curationId}
      LIMIT 1
    `;

    return normalizeEnabledCurationSections(rows[0]?.enabled_sections ?? null);
  } catch {
    return [...ALL_CURATION_SECTIONS];
  }
}

export async function setCurationEnabledSectionsSnapshotTx(args: {
  tx: Prisma.TransactionClient;
  curationId: string;
  sections: CurationSectionKey[];
}): Promise<void> {
  const normalizedSections = normalizeEnabledCurationSections(args.sections);
  const sectionsSql = sectionsArraySql(normalizedSections);

  await args.tx.$executeRaw`
    ALTER TABLE "curations"
    ADD COLUMN IF NOT EXISTS "enabled_sections" TEXT[] NOT NULL DEFAULT ARRAY['a','b','c','d','e','f']::text[]
  `;

  await args.tx.$executeRaw(
    Prisma.sql`
      UPDATE "curations"
      SET "enabled_sections" = ${sectionsSql}
      WHERE id::text = ${args.curationId}
    `
  );
}
