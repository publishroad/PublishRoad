ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "referred_by_creator_id" TEXT;

CREATE TABLE IF NOT EXISTS "content_creator_profiles" (
  "user_id" TEXT PRIMARY KEY,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "max_invites" INTEGER NOT NULL DEFAULT 0,
  "used_invites" INTEGER NOT NULL DEFAULT 0,
  "invite_token" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ,
  "disabled_at" TIMESTAMPTZ,
  "disabled_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "content_creator_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "content_creator_profiles_max_invites_check" CHECK ("max_invites" >= 0),
  CONSTRAINT "content_creator_profiles_used_invites_check" CHECK ("used_invites" >= 0)
);

CREATE TABLE IF NOT EXISTS "content_creator_referrals" (
  "id" TEXT PRIMARY KEY,
  "creator_user_id" TEXT NOT NULL,
  "referred_user_id" TEXT NOT NULL,
  "invite_token" TEXT NOT NULL,
  "accepted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "content_creator_referrals_creator_user_id_fkey"
    FOREIGN KEY ("creator_user_id") REFERENCES "content_creator_profiles"("user_id") ON DELETE CASCADE,
  CONSTRAINT "content_creator_referrals_referred_user_id_fkey"
    FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "content_creator_referrals_creator_user_id_referred_user_id_key" UNIQUE ("creator_user_id", "referred_user_id"),
  CONSTRAINT "content_creator_referrals_referred_user_id_key" UNIQUE ("referred_user_id")
);

CREATE INDEX IF NOT EXISTS "content_creator_profiles_is_enabled_idx"
  ON "content_creator_profiles" ("is_enabled");

CREATE INDEX IF NOT EXISTS "content_creator_profiles_enabled_usage_idx"
  ON "content_creator_profiles" ("is_enabled", "used_invites", "max_invites");

CREATE INDEX IF NOT EXISTS "content_creator_referrals_creator_user_id_accepted_at_idx"
  ON "content_creator_referrals" ("creator_user_id", "accepted_at" DESC);

CREATE INDEX IF NOT EXISTS "content_creator_referrals_invite_token_idx"
  ON "content_creator_referrals" ("invite_token");

CREATE INDEX IF NOT EXISTS "users_referred_by_creator_id_idx"
  ON "users" ("referred_by_creator_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_referred_by_creator_id_fkey'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_referred_by_creator_id_fkey"
      FOREIGN KEY ("referred_by_creator_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;