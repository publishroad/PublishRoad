ALTER TABLE "affiliate_profiles"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_disabled_by_admin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "marketing_channel" TEXT,
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMPTZ;

UPDATE "affiliate_profiles"
SET "is_active" = true
WHERE "enrolled_at" IS NOT NULL
  AND "is_disabled_by_admin" = false;

CREATE INDEX IF NOT EXISTS "affiliate_profiles_is_active_idx"
  ON "affiliate_profiles" ("is_active", "is_disabled_by_admin");
