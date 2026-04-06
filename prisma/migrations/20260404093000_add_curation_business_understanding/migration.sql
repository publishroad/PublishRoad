-- Add dedicated fields for business understanding input
ALTER TABLE "curations"
ADD COLUMN IF NOT EXISTS "problem_statement" TEXT,
ADD COLUMN IF NOT EXISTS "solution_statement" TEXT;

-- Backfill from legacy description if these are currently empty.
UPDATE "curations"
SET
  "problem_statement" = COALESCE("problem_statement", "description"),
  "solution_statement" = COALESCE("solution_statement", "description")
WHERE "description" IS NOT NULL
  AND ("problem_statement" IS NULL OR "solution_statement" IS NULL);
