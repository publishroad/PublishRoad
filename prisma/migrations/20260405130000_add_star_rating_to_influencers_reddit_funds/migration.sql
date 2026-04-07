-- Add star_rating to influencers
ALTER TABLE "influencers" ADD COLUMN IF NOT EXISTS "star_rating" INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS "influencers_star_rating_idx" ON "influencers" ("star_rating", "is_active");

-- Add star_rating to reddit_channels
ALTER TABLE "reddit_channels" ADD COLUMN IF NOT EXISTS "star_rating" INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS "reddit_channels_star_rating_idx" ON "reddit_channels" ("star_rating", "is_active");

-- Add star_rating to funds
ALTER TABLE "funds" ADD COLUMN IF NOT EXISTS "star_rating" INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS "funds_star_rating_idx" ON "funds" ("star_rating", "is_active");
