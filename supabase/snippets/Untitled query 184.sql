-- ─── PLAN CONFIGS ───────────────────────────────────────────────────────────
INSERT INTO plan_configs (id, name, slug, price_cents, credits, billing_type, features, is_active, sort_order, created_at, updated_at)
VALUES
  ('plan_free_001',     'Free',     'free',     0,     1,  'free',     '["1 curation","Up to 5 results per section","Distribution Sites","Guest Post & Backlink Sites","Press Release Sites","Social, Reddit & Investors locked"]',  true, 1, now(), now()),
  ('plan_starter_001',  'Starter',  'starter',  900,   1,  'one_time', '["1 full curation","Up to 20 results per section","Distribution, Guest Post & Press Sites","Reddit Communities","Social Influencers & Investors locked"]',   true, 2, now(), now()),
  ('plan_pro_001',      'Pro',      'pro',      3900,  1,  'one_time', '["Everything in Starter","Up to 20 results per section","All 6 sections unlocked","Social Influencers","Reddit Communities","Investors & Funds"]',           true, 3, now(), now()),
  ('plan_lifetime_001', 'Lifetime', 'lifetime', 59900, 15, 'lifetime', '["15 curations per month","Up to 20 results per section","All 6 sections unlocked","All future features included","Priority support"]',                      true, 4, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  credits = EXCLUDED.credits,
  billing_type = EXCLUDED.billing_type,
  features = EXCLUDED.features,
  is_active = true,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ─── COUNTRIES ──────────────────────────────────────────────────────────────
INSERT INTO countries (id, name, slug, flag_emoji, is_active, created_at, updated_at) VALUES
  ('country_us',  'United States',   'united-states',   '🇺🇸', true, now(), now()),
  ('country_gb',  'United Kingdom',  'united-kingdom',  '🇬🇧', true, now(), now()),
  ('country_ca',  'Canada',          'canada',          '🇨🇦', true, now(), now()),
  ('country_au',  'Australia',       'australia',       '🇦🇺', true, now(), now()),
  ('country_de',  'Germany',         'germany',         '🇩🇪', true, now(), now()),
  ('country_fr',  'France',          'france',          '🇫🇷', true, now(), now()),
  ('country_in',  'India',           'india',           '🇮🇳', true, now(), now()),
  ('country_nl',  'Netherlands',     'netherlands',     '🇳🇱', true, now(), now()),
  ('country_se',  'Sweden',          'sweden',          '🇸🇪', true, now(), now()),
  ('country_sg',  'Singapore',       'singapore',       '🇸🇬', true, now(), now()),
  ('country_ie',  'Ireland',         'ireland',         '🇮🇪', true, now(), now()),
  ('country_br',  'Brazil',          'brazil',          '🇧🇷', true, now(), now()),
  ('country_es',  'Spain',           'spain',           '🇪🇸', true, now(), now()),
  ('country_it',  'Italy',           'italy',           '🇮🇹', true, now(), now()),
  ('country_pl',  'Poland',          'poland',          '🇵🇱', true, now(), now()),
  ('country_nz',  'New Zealand',     'new-zealand',     '🇳🇿', true, now(), now()),
  ('country_za',  'South Africa',    'south-africa',    '🇿🇦', true, now(), now()),
  ('country_ae',  'UAE',             'uae',             '🇦🇪', true, now(), now()),
  ('country_ng',  'Nigeria',         'nigeria',         '🇳🇬', true, now(), now()),
  ('country_pk',  'Pakistan',        'pakistan',        '🇵🇰', true, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- ─── CATEGORIES ─────────────────────────────────────────────────────────────
INSERT INTO categories (id, name, slug, is_active, created_at, updated_at) VALUES
  ('cat_saas',      'SaaS',               'saas',           true, now(), now()),
  ('cat_ai',        'AI & Machine Learning','ai-ml',         true, now(), now()),
  ('cat_ecomm',     'E-Commerce',         'ecommerce',      true, now(), now()),
  ('cat_fintech',   'Fintech',            'fintech',        true, now(), now()),
  ('cat_health',    'Health & Wellness',  'health',         true, now(), now()),
  ('cat_edtech',    'EdTech',             'edtech',         true, now(), now()),
  ('cat_dev',       'Developer Tools',    'dev-tools',      true, now(), now()),
  ('cat_marketing', 'Marketing',          'marketing',      true, now(), now()),
  ('cat_productivity','Productivity',     'productivity',   true, now(), now()),
  ('cat_hr',        'HR & Recruiting',    'hr-recruiting',  true, now(), now()),
  ('cat_design',    'Design',             'design',         true, now(), now()),
  ('cat_security',  'Security',           'security',       true, now(), now()),
  ('cat_analytics', 'Analytics',          'analytics',      true, now(), now()),
  ('cat_social',    'Social Media',       'social-media',   true, now(), now()),
  ('cat_media',     'Media & Content',    'media-content',  true, now(), now()),
  ('cat_legal',     'Legal & Compliance', 'legal',          true, now(), now()),
  ('cat_crm',       'CRM & Sales',        'crm-sales',      true, now(), now()),
  ('cat_infra',     'Infrastructure',     'infrastructure', true, now(), now()),
  ('cat_mobile',    'Mobile Apps',        'mobile-apps',    true, now(), now()),
  ('cat_gaming',    'Gaming',             'gaming',         true, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- ─── TAGS ───────────────────────────────────────────────────────────────────
INSERT INTO tags (id, name, slug, is_active, created_at, updated_at) VALUES
  ('tag_startup',    'Startup',        'startup',        true, now(), now()),
  ('tag_b2b',        'B2B',            'b2b',            true, now(), now()),
  ('tag_b2c',        'B2C',            'b2c',            true, now(), now()),
  ('tag_open',       'Open Source',    'open-source',    true, now(), now()),
  ('tag_mobile',     'Mobile',         'mobile',         true, now(), now()),
  ('tag_api',        'API',            'api',            true, now(), now()),
  ('tag_nocode',     'No-Code',        'no-code',        true, now(), now()),
  ('tag_enterprise', 'Enterprise',     'enterprise',     true, now(), now()),
  ('tag_free',       'Free Plan',      'free-plan',      true, now(), now()),
  ('tag_chrome',     'Chrome Extension','chrome-ext',    true, now(), now()),
  ('tag_automation', 'Automation',     'automation',     true, now(), now()),
  ('tag_newsletter', 'Newsletter',     'newsletter',     true, now(), now()),
  ('tag_community',  'Community',      'community',      true, now(), now()),
  ('tag_remote',     'Remote Work',    'remote-work',    true, now(), now()),
  ('tag_privacy',    'Privacy',        'privacy',        true, now(), now()),
  ('tag_seo',        'SEO',            'seo',            true, now(), now()),
  ('tag_payments',   'Payments',       'payments',       true, now(), now()),
  ('tag_ai',         'AI-Powered',     'ai-powered',     true, now(), now()),
  ('tag_self',       'Self-Hosted',    'self-hosted',    true, now(), now()),
  ('tag_realtime',   'Real-Time',      'real-time',      true, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- ─── ADMIN USER ─────────────────────────────────────────────────────────────
INSERT INTO admin_users (id, email, name, password_hash, role, is_active, backup_codes, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'adminak@publishroad.com',
  'Admin',
  '$2b$12$rPR7ddFROSLxOl3KazbC1.5n33PJEm5GfbMtLssXqvIdE3eSD4aKW',
  'super_admin',
  true,
  '[]',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = '$2b$12$rPR7ddFROSLxOl3KazbC1.5n33PJEm5GfbMtLssXqvIdE3eSD4aKW',
  is_active = true,
  updated_at = now();
