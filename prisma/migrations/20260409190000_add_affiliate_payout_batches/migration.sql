CREATE TABLE IF NOT EXISTS "affiliate_payout_batches" (
  "id" TEXT PRIMARY KEY,
  "affiliate_user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_amount_cents" INTEGER NOT NULL,
  "commission_count" INTEGER NOT NULL,
  "payout_method" TEXT NOT NULL,
  "payout_reference" TEXT,
  "admin_note" TEXT,
  "paid_at" TIMESTAMPTZ NOT NULL,
  "created_by_admin_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'paid',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "affiliate_payout_batches_status_check" CHECK ("status" IN ('draft', 'approved', 'paid', 'failed', 'cancelled'))
);

ALTER TABLE "affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "payout_batch_id" TEXT REFERENCES "affiliate_payout_batches"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "affiliate_payout_batches_affiliate_user_id_paid_at_idx"
  ON "affiliate_payout_batches" ("affiliate_user_id", "paid_at");

CREATE INDEX IF NOT EXISTS "affiliate_payout_batches_status_paid_at_idx"
  ON "affiliate_payout_batches" ("status", "paid_at");

CREATE INDEX IF NOT EXISTS "affiliate_commissions_payout_batch_id_idx"
  ON "affiliate_commissions" ("payout_batch_id");
