-- Add website quality metrics used in admin input and curation reports
ALTER TABLE "websites"
ADD COLUMN "pa" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "spam_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "traffic" INTEGER NOT NULL DEFAULT 0;
