ALTER TABLE "plan_configs"
ADD COLUMN IF NOT EXISTS "compare_at_price_cents" INTEGER;
