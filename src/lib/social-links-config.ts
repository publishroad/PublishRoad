import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_SOCIAL_LINKS_CONFIG,
  normalizeSocialLinksConfig,
  type SocialLinkConfig,
} from "@/lib/social-links-config-shared";

export async function getSocialLinksConfig(): Promise<SocialLinkConfig[]> {
  try {
    await db.$executeRaw`
      ALTER TABLE "beta_config"
      ADD COLUMN IF NOT EXISTS "social_links" JSONB NOT NULL DEFAULT '[]'::jsonb
    `;

    const rows = await db.$queryRaw<Array<{ social_links: unknown }>>`
      SELECT social_links
      FROM beta_config
      WHERE id = 'default'
      LIMIT 1
    `;

    const normalized = normalizeSocialLinksConfig(rows[0]?.social_links ?? null);

    if (!rows[0]) {
      const socialLinksJson = JSON.stringify(normalized);
      await db.$executeRaw(
        Prisma.sql`
          INSERT INTO "beta_config" ("id", "enabled", "social_links", "updated_at")
          VALUES ('default', false, CAST(${socialLinksJson} AS jsonb), NOW())
          ON CONFLICT ("id") DO UPDATE
          SET
            "social_links" = CAST(${socialLinksJson} AS jsonb),
            "updated_at" = NOW()
        `
      );
    }

    return normalized;
  } catch {
    return normalizeSocialLinksConfig(DEFAULT_SOCIAL_LINKS_CONFIG);
  }
}

export async function setSocialLinksConfig(args: {
  links: SocialLinkConfig[];
  adminId: string;
}): Promise<SocialLinkConfig[]> {
  const normalized = normalizeSocialLinksConfig(args.links);
  const socialLinksJson = JSON.stringify(normalized);

  await db.$executeRaw`
    ALTER TABLE "beta_config"
    ADD COLUMN IF NOT EXISTS "social_links" JSONB NOT NULL DEFAULT '[]'::jsonb
  `;

  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "beta_config" ("id", "enabled", "social_links", "updated_by_id", "updated_at")
      VALUES ('default', false, CAST(${socialLinksJson} AS jsonb), ${args.adminId}, NOW())
      ON CONFLICT ("id") DO UPDATE
      SET
        "social_links" = CAST(${socialLinksJson} AS jsonb),
        "updated_by_id" = ${args.adminId},
        "updated_at" = NOW()
    `
  );

  return normalized;
}
