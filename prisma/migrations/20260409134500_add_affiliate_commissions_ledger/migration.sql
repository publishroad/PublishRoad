CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
  "id" TEXT PRIMARY KEY,
  "affiliate_user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referred_user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "payment_id" TEXT UNIQUE REFERENCES "payments"("id") ON DELETE SET NULL,
  "referral_code" TEXT NOT NULL,
  "payment_type" "PaymentType" NOT NULL,
  "commission_pct" INTEGER NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "earned_at" TIMESTAMPTZ NOT NULL,
  "eligible_at" TIMESTAMPTZ NOT NULL,
  "paid_at" TIMESTAMPTZ,
  "payout_method" TEXT,
  "payout_reference" TEXT,
  "admin_note" TEXT,
  "marked_by_admin_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "affiliate_commissions_status_check" CHECK ("status" IN ('pending', 'eligible', 'paid', 'reversed'))
);

CREATE INDEX IF NOT EXISTS "affiliate_commissions_affiliate_user_id_status_idx"
  ON "affiliate_commissions" ("affiliate_user_id", "status");

CREATE INDEX IF NOT EXISTS "affiliate_commissions_status_eligible_at_idx"
  ON "affiliate_commissions" ("status", "eligible_at");

CREATE INDEX IF NOT EXISTS "affiliate_commissions_paid_at_idx"
  ON "affiliate_commissions" ("paid_at");

INSERT INTO "affiliate_commissions" (
  "id",
  "affiliate_user_id",
  "referred_user_id",
  "payment_id",
  "referral_code",
  "payment_type",
  "commission_pct",
  "amount_cents",
  "status",
  "earned_at",
  "eligible_at",
  "created_at",
  "updated_at"
)
SELECT
  CONCAT('ac_', p.id),
  ar.referrer_user_id,
  ar.referred_user_id,
  p.id,
  ar.referral_code,
  p.payment_type,
  CASE
    WHEN p.payment_type = 'hire_us' THEN ap.hire_us_commission_pct
    ELSE ap.starter_commission_pct
  END AS commission_pct,
  CASE
    WHEN p.payment_type = 'hire_us' THEN FLOOR((p.amount_cents * ap.hire_us_commission_pct) / 100.0)::int
    ELSE FLOOR((p.amount_cents * ap.starter_commission_pct) / 100.0)::int
  END AS amount_cents,
  CASE
    WHEN (p.created_at + INTERVAL '15 days') <= NOW() THEN 'eligible'
    ELSE 'pending'
  END AS status,
  p.created_at,
  p.created_at + INTERVAL '15 days',
  p.created_at,
  NOW()
FROM affiliate_referrals ar
JOIN affiliate_profiles ap ON ap.user_id = ar.referrer_user_id
JOIN payments p ON p.user_id = ar.referred_user_id
LEFT JOIN plan_configs pc ON pc.id = p.plan_id
WHERE p.status = 'completed'
  AND (
    p.payment_type = 'hire_us'
    OR (p.payment_type = 'plan' AND pc.slug = 'starter')
  )
ON CONFLICT ("payment_id") DO NOTHING;
