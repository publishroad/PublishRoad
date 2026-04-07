-- Add star_rating column (1-5 admin quality score; NULL = unrated)
ALTER TABLE "websites"
ADD COLUMN IF NOT EXISTS "star_rating" INTEGER DEFAULT NULL;

-- Backfill: existing pinned sites get 4 stars (minimum guaranteed-inclusion threshold)
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'websites'
			AND column_name = 'is_pinned'
	) THEN
		UPDATE "websites"
		SET "star_rating" = 4
		WHERE "is_pinned" = TRUE AND "star_rating" IS NULL;
	END IF;
END $$;

-- Drop the old boolean flag now that star_rating supersedes it
ALTER TABLE "websites"
DROP COLUMN IF EXISTS "is_pinned";

-- Index for fast guaranteed-inclusion query in curation engine
CREATE INDEX IF NOT EXISTS "websites_star_rating_idx" ON "websites" ("star_rating", "is_active");
