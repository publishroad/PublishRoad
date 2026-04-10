CREATE TABLE IF NOT EXISTS "affiliate_profiles" (
  "user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "referral_code" TEXT NOT NULL UNIQUE,
  "paypal_email" TEXT,
  "starter_commission_pct" INTEGER NOT NULL DEFAULT 25,
  "hire_us_commission_pct" INTEGER NOT NULL DEFAULT 15,
  "enrolled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "affiliate_profiles_starter_commission_pct_check" CHECK ("starter_commission_pct" >= 0 AND "starter_commission_pct" <= 100),
  CONSTRAINT "affiliate_profiles_hire_us_commission_pct_check" CHECK ("hire_us_commission_pct" >= 0 AND "hire_us_commission_pct" <= 100)
);

CREATE TABLE IF NOT EXISTS "affiliate_referrals" (
  "id" TEXT PRIMARY KEY,
  "referrer_user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referred_user_id" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "referral_code" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "affiliate_referrals_referrer_user_id_idx" ON "affiliate_referrals"("referrer_user_id");
CREATE INDEX IF NOT EXISTS "affiliate_referrals_referral_code_idx" ON "affiliate_referrals"("referral_code");