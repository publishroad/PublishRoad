ALTER TABLE "beta_config"
ADD COLUMN IF NOT EXISTS "pricing_comparison_rows" JSONB NOT NULL DEFAULT '[]'::jsonb;
