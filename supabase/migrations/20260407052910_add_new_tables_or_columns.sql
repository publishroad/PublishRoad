create extension if not exists "pg_net" with schema "extensions";

-- Create PaymentType enum if it doesn't already exist
DO $$ BEGIN
  CREATE TYPE "public"."PaymentType" AS ENUM ('plan', 'hire_us');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTE: rls_auto_enable() is intentionally not dropped — it has dependents (ensure_rls trigger)

alter table "public"."_prisma_migrations" disable row level security;
alter table "public"."admin_users" disable row level security;
alter table "public"."ai_config" disable row level security;
alter table "public"."audit_logs" disable row level security;

alter table "public"."beta_config" add column if not exists "curation_enabled_sections" text[] not null default ARRAY['a'::text, 'b'::text, 'c'::text, 'd'::text, 'e'::text, 'f'::text];
alter table "public"."beta_config" add column if not exists "hire_us_packages" jsonb not null default '{}'::jsonb;
alter table "public"."beta_config" add column if not exists "pricing_comparison_rows" jsonb not null default '[]'::jsonb;
alter table "public"."beta_config" disable row level security;

alter table "public"."blog_posts" disable row level security;
alter table "public"."categories" disable row level security;
alter table "public"."contact_submissions" disable row level security;
alter table "public"."countries" disable row level security;
alter table "public"."curation_results" disable row level security;

alter table "public"."curations" add column if not exists "enabled_sections" text[] not null default ARRAY['a'::text, 'b'::text, 'c'::text, 'd'::text, 'e'::text, 'f'::text];
alter table "public"."curations" add column if not exists "problem_statement" text;
alter table "public"."curations" add column if not exists "solution_statement" text;
alter table "public"."curations" disable row level security;

alter table "public"."email_provider_config" disable row level security;
alter table "public"."fund_categories" disable row level security;
alter table "public"."fund_tags" disable row level security;

alter table "public"."funds" add column if not exists "star_rating" integer;
alter table "public"."funds" disable row level security;

alter table "public"."influencer_categories" disable row level security;
alter table "public"."influencer_tags" disable row level security;

alter table "public"."influencers" add column if not exists "star_rating" integer;
alter table "public"."influencers" disable row level security;

alter table "public"."notifications" disable row level security;
alter table "public"."payment_gateway_config" disable row level security;

alter table "public"."payments" add column if not exists "payment_type" public."PaymentType" not null default 'plan'::public."PaymentType";
alter table "public"."payments" add column if not exists "provider_payment_id" text;
alter table "public"."payments" disable row level security;

alter table "public"."plan_configs" add column if not exists "is_visible" boolean not null default true;
alter table "public"."plan_configs" disable row level security;

alter table "public"."processed_stripe_events" disable row level security;
alter table "public"."reddit_channel_categories" disable row level security;
alter table "public"."reddit_channel_tags" disable row level security;

alter table "public"."reddit_channels" add column if not exists "star_rating" integer;
alter table "public"."reddit_channels" disable row level security;

alter table "public"."referrals" disable row level security;
alter table "public"."service_leads" disable row level security;
alter table "public"."sub_categories" disable row level security;
alter table "public"."tags" disable row level security;
alter table "public"."users" disable row level security;
alter table "public"."website_categories" disable row level security;
alter table "public"."website_tags" disable row level security;

-- Drop is_pinned only if it still exists (already dropped by Prisma migration)
alter table "public"."websites" drop column if exists "is_pinned";
alter table "public"."websites" add column if not exists "star_rating" integer;
alter table "public"."websites" disable row level security;

CREATE INDEX IF NOT EXISTS funds_star_rating_idx ON public.funds USING btree (star_rating, is_active);
CREATE INDEX IF NOT EXISTS influencers_star_rating_idx ON public.influencers USING btree (star_rating, is_active);
CREATE INDEX IF NOT EXISTS reddit_channels_star_rating_idx ON public.reddit_channels USING btree (star_rating, is_active);
CREATE INDEX IF NOT EXISTS websites_star_rating_idx ON public.websites USING btree (star_rating, is_active);
CREATE INDEX IF NOT EXISTS websites_star_rating_is_active_idx ON public.websites USING btree (star_rating, is_active);
