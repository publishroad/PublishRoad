import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_SITE_NOTICE_CONFIG,
  normalizeSiteNoticeConfig,
  type SiteNoticeConfig,
} from "@/lib/site-notice-config-shared";

export async function getSiteNoticeConfig(): Promise<SiteNoticeConfig> {
  try {
    await db.$executeRaw`
      ALTER TABLE "beta_config"
      ADD COLUMN IF NOT EXISTS "site_notice" JSONB NOT NULL DEFAULT '{}'::jsonb
    `;

    const rows = await db.$queryRaw<Array<{ site_notice: unknown }>>`
      SELECT site_notice
      FROM beta_config
      WHERE id = 'default'
      LIMIT 1
    `;

    const normalized = normalizeSiteNoticeConfig(rows[0]?.site_notice ?? null);

    if (!rows[0]) {
      const configJson = JSON.stringify(normalized);
      await db.$executeRaw(
        Prisma.sql`
          INSERT INTO "beta_config" ("id", "enabled", "site_notice", "updated_at")
          VALUES ('default', false, CAST(${configJson} AS jsonb), NOW())
          ON CONFLICT ("id") DO UPDATE
          SET
            "site_notice" = CAST(${configJson} AS jsonb),
            "updated_at" = NOW()
        `
      );
    }

    return normalized;
  } catch {
    return DEFAULT_SITE_NOTICE_CONFIG;
  }
}

export async function setSiteNoticeConfig(args: {
  config: SiteNoticeConfig;
  adminId: string;
}): Promise<SiteNoticeConfig> {
  const normalized = normalizeSiteNoticeConfig(args.config);
  const configJson = JSON.stringify(normalized);

  await db.$executeRaw`
    ALTER TABLE "beta_config"
    ADD COLUMN IF NOT EXISTS "site_notice" JSONB NOT NULL DEFAULT '{}'::jsonb
  `;

  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "beta_config" ("id", "enabled", "site_notice", "updated_by_id", "updated_at")
      VALUES ('default', false, CAST(${configJson} AS jsonb), ${args.adminId}, NOW())
      ON CONFLICT ("id") DO UPDATE
      SET
        "site_notice" = CAST(${configJson} AS jsonb),
        "updated_by_id" = ${args.adminId},
        "updated_at" = NOW()
    `
  );

  return normalized;
}
