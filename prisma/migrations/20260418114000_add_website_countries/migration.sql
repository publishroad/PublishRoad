CREATE TABLE IF NOT EXISTS "website_countries" (
  "website_id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  CONSTRAINT "website_countries_pkey" PRIMARY KEY ("website_id", "country_id"),
  CONSTRAINT "website_countries_website_id_fkey"
    FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "website_countries_country_id_fkey"
    FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "website_countries_country_id_website_id_idx"
ON "website_countries" ("country_id", "website_id");

-- Backfill existing single-country websites into join table.
INSERT INTO "website_countries" ("website_id", "country_id")
SELECT "id", "country_id"
FROM "websites"
WHERE "country_id" IS NOT NULL
ON CONFLICT DO NOTHING;
