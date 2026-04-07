import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_HIRE_US_PRICING_CONFIG,
  type HireUsPricingConfig,
  normalizeHireUsPricingConfig,
} from "@/lib/hire-us-config-shared";

export async function getHireUsPricingConfig(): Promise<HireUsPricingConfig> {
  try {
    await db.$executeRaw`
      ALTER TABLE "beta_config"
      ADD COLUMN IF NOT EXISTS "hire_us_packages" JSONB NOT NULL DEFAULT '{}'::jsonb
    `;

    const rows = await db.$queryRaw<Array<{ hire_us_packages: unknown }>>`
      SELECT hire_us_packages
      FROM beta_config
      WHERE id = 'default'
      LIMIT 1
    `;

    const normalized = normalizeHireUsPricingConfig(rows[0]?.hire_us_packages ?? null);

    if (!rows[0]) {
      const configJson = JSON.stringify(normalized);
      await db.$executeRaw(
        Prisma.sql`
          INSERT INTO "beta_config" ("id", "enabled", "hire_us_packages", "updated_at")
          VALUES ('default', false, CAST(${configJson} AS jsonb), NOW())
          ON CONFLICT ("id") DO UPDATE
          SET
            "hire_us_packages" = CAST(${configJson} AS jsonb),
            "updated_at" = NOW()
        `
      );
    }

    return normalized;
  } catch {
    return DEFAULT_HIRE_US_PRICING_CONFIG;
  }
}

export async function setHireUsPricingConfig(args: {
  config: HireUsPricingConfig;
  adminId: string;
}): Promise<HireUsPricingConfig> {
  const normalized = normalizeHireUsPricingConfig(args.config);
  const configJson = JSON.stringify(normalized);

  await db.$executeRaw`
    ALTER TABLE "beta_config"
    ADD COLUMN IF NOT EXISTS "hire_us_packages" JSONB NOT NULL DEFAULT '{}'::jsonb
  `;

  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "beta_config" ("id", "enabled", "hire_us_packages", "updated_by_id", "updated_at")
      VALUES ('default', false, CAST(${configJson} AS jsonb), ${args.adminId}, NOW())
      ON CONFLICT ("id") DO UPDATE
      SET
        "hire_us_packages" = CAST(${configJson} AS jsonb),
        "updated_by_id" = ${args.adminId},
        "updated_at" = NOW()
    `
  );

  return normalized;
}
