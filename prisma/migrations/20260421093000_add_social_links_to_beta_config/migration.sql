ALTER TABLE "beta_config"
ADD COLUMN IF NOT EXISTS "social_links" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "beta_config"
SET "social_links" =
	CASE
		WHEN COALESCE(jsonb_array_length("social_links"), 0) = 0 THEN
			'[
				{"id":"social-x","platform":"x","label":"X / Twitter","href":"https://x.com/publishroad","enabled":true,"order":0},
				{"id":"social-linkedin","platform":"linkedin","label":"LinkedIn","href":"https://linkedin.com/company/publishroad","enabled":true,"order":1},
				{"id":"social-instagram","platform":"instagram","label":"Instagram","href":"https://instagram.com/publishroad","enabled":true,"order":2},
				{"id":"social-producthunt","platform":"producthunt","label":"ProductHunt","href":"https://producthunt.com","enabled":true,"order":3}
			]'::jsonb
		ELSE "social_links"
	END
WHERE "id" = 'default';