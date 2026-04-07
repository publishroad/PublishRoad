ALTER TABLE "beta_config"
ADD COLUMN IF NOT EXISTS "curation_enabled_sections" TEXT[] NOT NULL DEFAULT ARRAY['a','b','c','d','e','f']::text[];

ALTER TABLE "curations"
ADD COLUMN IF NOT EXISTS "enabled_sections" TEXT[] NOT NULL DEFAULT ARRAY['a','b','c','d','e','f']::text[];
