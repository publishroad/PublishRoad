ALTER TABLE "beta_config"
ADD COLUMN IF NOT EXISTS "hire_us_packages" JSONB NOT NULL DEFAULT '{}'::jsonb;