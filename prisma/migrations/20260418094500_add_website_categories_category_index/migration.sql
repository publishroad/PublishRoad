CREATE INDEX IF NOT EXISTS "website_categories_category_id_website_id_idx"
ON "website_categories" ("category_id", "website_id");
