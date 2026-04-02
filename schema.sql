


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."AdminRole" AS ENUM (
    'super_admin',
    'admin',
    'editor'
);


ALTER TYPE "public"."AdminRole" OWNER TO "postgres";


CREATE TYPE "public"."AuthProvider" AS ENUM (
    'email',
    'google'
);


ALTER TYPE "public"."AuthProvider" OWNER TO "postgres";


CREATE TYPE "public"."BillingType" AS ENUM (
    'free',
    'one_time',
    'monthly',
    'lifetime'
);


ALTER TYPE "public"."BillingType" OWNER TO "postgres";


CREATE TYPE "public"."BlogStatus" AS ENUM (
    'draft',
    'published'
);


ALTER TYPE "public"."BlogStatus" OWNER TO "postgres";


CREATE TYPE "public"."CurationSection" AS ENUM (
    'a',
    'b',
    'c',
    'd',
    'e',
    'f'
);


ALTER TYPE "public"."CurationSection" OWNER TO "postgres";


CREATE TYPE "public"."CurationStatus" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE "public"."CurationStatus" OWNER TO "postgres";


CREATE TYPE "public"."EmailProvider" AS ENUM (
    'resend',
    'smtp',
    'sendgrid',
    'ses'
);


ALTER TYPE "public"."EmailProvider" OWNER TO "postgres";


CREATE TYPE "public"."InfluencerPlatform" AS ENUM (
    'tiktok',
    'instagram',
    'youtube',
    'twitter'
);


ALTER TYPE "public"."InfluencerPlatform" OWNER TO "postgres";


CREATE TYPE "public"."InvestmentStage" AS ENUM (
    'pre_seed',
    'seed',
    'series_a',
    'series_b',
    'series_c',
    'growth',
    'late_stage'
);


ALTER TYPE "public"."InvestmentStage" OWNER TO "postgres";


CREATE TYPE "public"."LeadStatus" AS ENUM (
    'new',
    'contacted',
    'closed'
);


ALTER TYPE "public"."LeadStatus" OWNER TO "postgres";


CREATE TYPE "public"."PaymentProvider" AS ENUM (
    'stripe',
    'razorpay',
    'paypal'
);


ALTER TYPE "public"."PaymentProvider" OWNER TO "postgres";


CREATE TYPE "public"."PaymentStatus" AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE "public"."PaymentStatus" OWNER TO "postgres";


CREATE TYPE "public"."PostingDifficulty" AS ENUM (
    'easy',
    'medium',
    'hard'
);


ALTER TYPE "public"."PostingDifficulty" OWNER TO "postgres";


CREATE TYPE "public"."UserResultStatus" AS ENUM (
    'saved',
    'hidden'
);


ALTER TYPE "public"."UserResultStatus" OWNER TO "postgres";


CREATE TYPE "public"."WebsiteType" AS ENUM (
    'distribution',
    'guest_post',
    'press_release'
);


ALTER TYPE "public"."WebsiteType" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "totp_secret" "text",
    "totp_enabled" boolean DEFAULT false NOT NULL,
    "backup_codes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "role" "public"."AdminRole" DEFAULT 'admin'::"public"."AdminRole" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_config" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "base_url" "text" NOT NULL,
    "api_key" "text" NOT NULL,
    "model_name" "text" NOT NULL,
    "max_tokens" integer DEFAULT 4096 NOT NULL,
    "temperature" double precision DEFAULT 0.3 NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "updated_by_id" "text"
);


ALTER TABLE "public"."ai_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "text" NOT NULL,
    "admin_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "entity" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beta_config" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "updated_by_id" "text"
);


ALTER TABLE "public"."beta_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "excerpt" "text",
    "content" "text" NOT NULL,
    "featured_image" "text",
    "category_id" "text",
    "author_id" "text" NOT NULL,
    "status" "public"."BlogStatus" DEFAULT 'draft'::"public"."BlogStatus" NOT NULL,
    "publish_date" timestamp(3) without time zone,
    "meta_title" "text",
    "meta_description" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_submissions" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."contact_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "flag_emoji" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curation_results" (
    "id" "text" NOT NULL,
    "curation_id" "text" NOT NULL,
    "website_id" "text",
    "match_score" double precision NOT NULL,
    "match_reason" "text",
    "section" "public"."CurationSection" NOT NULL,
    "rank" integer NOT NULL,
    "user_status" "public"."UserResultStatus",
    "user_notes" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fund_id" "text",
    "influencer_id" "text",
    "reddit_channel_id" "text"
);


ALTER TABLE "public"."curation_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curations" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "product_url" "text" NOT NULL,
    "country_id" "text",
    "keywords" "text"[] DEFAULT ARRAY[]::"text"[],
    "description" "text",
    "status" "public"."CurationStatus" DEFAULT 'pending'::"public"."CurationStatus" NOT NULL,
    "error_message" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."curations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_provider_config" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "provider" "public"."EmailProvider" DEFAULT 'resend'::"public"."EmailProvider" NOT NULL,
    "from_address" "text" NOT NULL,
    "api_key" "text",
    "host" "text",
    "port" integer,
    "username" "text",
    "password" "text",
    "use_tls" boolean DEFAULT true NOT NULL,
    "additional_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "updated_by_id" "text"
);


ALTER TABLE "public"."email_provider_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fund_categories" (
    "fund_id" "text" NOT NULL,
    "category_id" "text" NOT NULL
);


ALTER TABLE "public"."fund_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fund_tags" (
    "fund_id" "text" NOT NULL,
    "tag_id" "text" NOT NULL
);


ALTER TABLE "public"."fund_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funds" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "website_url" "text" NOT NULL,
    "description" "text",
    "investment_stage" "public"."InvestmentStage",
    "ticket_size" "text",
    "country_id" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "tag_slugs" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "category_slugs" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."funds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."influencer_categories" (
    "influencer_id" "text" NOT NULL,
    "category_id" "text" NOT NULL
);


ALTER TABLE "public"."influencer_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."influencer_tags" (
    "influencer_id" "text" NOT NULL,
    "tag_id" "text" NOT NULL
);


ALTER TABLE "public"."influencer_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."influencers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "platform" "public"."InfluencerPlatform" NOT NULL,
    "followers_count" integer DEFAULT 0 NOT NULL,
    "country_id" "text",
    "description" "text",
    "profile_link" "text" NOT NULL,
    "email" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "tag_slugs" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "category_slugs" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."influencers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_gateway_config" (
    "id" "text" NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "public_key" "text",
    "secret_key" "text",
    "webhook_secret" "text",
    "additional_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "updated_by_id" "text",
    "is_active" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."payment_gateway_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "plan_id" "text",
    "stripe_payment_intent_id" "text",
    "stripe_subscription_id" "text",
    "stripe_invoice_id" "text",
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "status" "public"."PaymentStatus" DEFAULT 'pending'::"public"."PaymentStatus" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_configs" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "price_cents" integer NOT NULL,
    "credits" integer NOT NULL,
    "billing_type" "public"."BillingType" NOT NULL,
    "stripe_price_id" "text",
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."plan_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_stripe_events" (
    "event_id" "text" NOT NULL,
    "processed_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."processed_stripe_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reddit_channel_categories" (
    "reddit_channel_id" "text" NOT NULL,
    "category_id" "text" NOT NULL
);


ALTER TABLE "public"."reddit_channel_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reddit_channel_tags" (
    "reddit_channel_id" "text" NOT NULL,
    "tag_id" "text" NOT NULL
);


ALTER TABLE "public"."reddit_channel_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reddit_channels" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "weekly_visitors" integer DEFAULT 0 NOT NULL,
    "total_members" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "posting_difficulty" "public"."PostingDifficulty",
    "is_active" boolean DEFAULT true NOT NULL,
    "tag_slugs" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "category_slugs" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."reddit_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "text" NOT NULL,
    "referrer_user_id" "text" NOT NULL,
    "referred_user_id" "text",
    "code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_leads" (
    "id" "text" NOT NULL,
    "user_id" "text",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "website_url" "text",
    "service_type" "text",
    "message" "text",
    "status" "public"."LeadStatus" DEFAULT 'new'::"public"."LeadStatus" NOT NULL,
    "notes" "text",
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."service_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sub_categories" (
    "id" "text" NOT NULL,
    "category_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."sub_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "password_hash" "text",
    "auth_provider" "public"."AuthProvider" DEFAULT 'email'::"public"."AuthProvider" NOT NULL,
    "plan_id" "text",
    "credits_remaining" integer DEFAULT 1 NOT NULL,
    "stripe_customer_id" "text",
    "email_verified_at" timestamp(3) without time zone,
    "email_verify_token" "text",
    "reset_token" "text",
    "reset_token_expiry" timestamp(3) without time zone,
    "failed_login_count" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp(3) without time zone,
    "deleted_at" timestamp(3) without time zone,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "stripe_customer_hash" "text",
    "credits_reset_at" timestamp(3) without time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."website_categories" (
    "website_id" "text" NOT NULL,
    "category_id" "text" NOT NULL
);


ALTER TABLE "public"."website_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."website_tags" (
    "website_id" "text" NOT NULL,
    "tag_id" "text" NOT NULL
);


ALTER TABLE "public"."website_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."websites" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "type" "public"."WebsiteType" NOT NULL,
    "da" integer DEFAULT 0 NOT NULL,
    "country_id" "text",
    "category_id" "text",
    "sub_category_id" "text",
    "description" "text",
    "submission_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "is_excluded" boolean DEFAULT false NOT NULL,
    "tag_slugs" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "pa" integer DEFAULT 0 NOT NULL,
    "spam_score" integer DEFAULT 0 NOT NULL,
    "traffic" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."websites" OWNER TO "postgres";


ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_config"
    ADD CONSTRAINT "ai_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beta_config"
    ADD CONSTRAINT "beta_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_submissions"
    ADD CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curation_results"
    ADD CONSTRAINT "curation_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curations"
    ADD CONSTRAINT "curations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_provider_config"
    ADD CONSTRAINT "email_provider_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fund_categories"
    ADD CONSTRAINT "fund_categories_pkey" PRIMARY KEY ("fund_id", "category_id");



ALTER TABLE ONLY "public"."fund_tags"
    ADD CONSTRAINT "fund_tags_pkey" PRIMARY KEY ("fund_id", "tag_id");



ALTER TABLE ONLY "public"."funds"
    ADD CONSTRAINT "funds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."influencer_categories"
    ADD CONSTRAINT "influencer_categories_pkey" PRIMARY KEY ("influencer_id", "category_id");



ALTER TABLE ONLY "public"."influencer_tags"
    ADD CONSTRAINT "influencer_tags_pkey" PRIMARY KEY ("influencer_id", "tag_id");



ALTER TABLE ONLY "public"."influencers"
    ADD CONSTRAINT "influencers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_gateway_config"
    ADD CONSTRAINT "payment_gateway_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_configs"
    ADD CONSTRAINT "plan_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_stripe_events"
    ADD CONSTRAINT "processed_stripe_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."reddit_channel_categories"
    ADD CONSTRAINT "reddit_channel_categories_pkey" PRIMARY KEY ("reddit_channel_id", "category_id");



ALTER TABLE ONLY "public"."reddit_channel_tags"
    ADD CONSTRAINT "reddit_channel_tags_pkey" PRIMARY KEY ("reddit_channel_id", "tag_id");



ALTER TABLE ONLY "public"."reddit_channels"
    ADD CONSTRAINT "reddit_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_leads"
    ADD CONSTRAINT "service_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_categories"
    ADD CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."website_categories"
    ADD CONSTRAINT "website_categories_pkey" PRIMARY KEY ("website_id", "category_id");



ALTER TABLE ONLY "public"."website_tags"
    ADD CONSTRAINT "website_tags_pkey" PRIMARY KEY ("website_id", "tag_id");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "admin_users_email_key" ON "public"."admin_users" USING "btree" ("email");



CREATE INDEX "audit_logs_admin_id_created_at_idx" ON "public"."audit_logs" USING "btree" ("admin_id", "created_at" DESC);



CREATE INDEX "audit_logs_entity_entity_id_idx" ON "public"."audit_logs" USING "btree" ("entity", "entity_id");



CREATE UNIQUE INDEX "blog_posts_slug_key" ON "public"."blog_posts" USING "btree" ("slug");



CREATE INDEX "blog_posts_status_publish_date_idx" ON "public"."blog_posts" USING "btree" ("status", "publish_date" DESC);



CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories" USING "btree" ("name");



CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories" USING "btree" ("slug");



CREATE UNIQUE INDEX "countries_name_key" ON "public"."countries" USING "btree" ("name");



CREATE UNIQUE INDEX "countries_slug_key" ON "public"."countries" USING "btree" ("slug");



CREATE INDEX "curation_results_curation_id_section_rank_idx" ON "public"."curation_results" USING "btree" ("curation_id", "section", "rank");



CREATE INDEX "curations_user_id_created_at_idx" ON "public"."curations" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "influencers_platform_is_active_idx" ON "public"."influencers" USING "btree" ("platform", "is_active");



CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE UNIQUE INDEX "plan_configs_slug_key" ON "public"."plan_configs" USING "btree" ("slug");



CREATE UNIQUE INDEX "reddit_channels_url_key" ON "public"."reddit_channels" USING "btree" ("url");



CREATE UNIQUE INDEX "referrals_code_key" ON "public"."referrals" USING "btree" ("code");



CREATE UNIQUE INDEX "sub_categories_slug_key" ON "public"."sub_categories" USING "btree" ("slug");



CREATE UNIQUE INDEX "tags_name_key" ON "public"."tags" USING "btree" ("name");



CREATE UNIQUE INDEX "tags_slug_key" ON "public"."tags" USING "btree" ("slug");



CREATE INDEX "users_email_idx" ON "public"."users" USING "btree" ("email");



CREATE UNIQUE INDEX "users_email_key" ON "public"."users" USING "btree" ("email");



CREATE INDEX "users_stripe_customer_hash_idx" ON "public"."users" USING "btree" ("stripe_customer_hash");



CREATE INDEX "websites_country_id_is_active_idx" ON "public"."websites" USING "btree" ("country_id", "is_active");



CREATE INDEX "websites_type_is_active_idx" ON "public"."websites" USING "btree" ("type", "is_active");



CREATE UNIQUE INDEX "websites_url_key" ON "public"."websites" USING "btree" ("url");



ALTER TABLE ONLY "public"."ai_config"
    ADD CONSTRAINT "ai_config_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."admin_users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."beta_config"
    ADD CONSTRAINT "beta_config_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."admin_users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."admin_users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."curation_results"
    ADD CONSTRAINT "curation_results_curation_id_fkey" FOREIGN KEY ("curation_id") REFERENCES "public"."curations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."curation_results"
    ADD CONSTRAINT "curation_results_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."curation_results"
    ADD CONSTRAINT "curation_results_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."curation_results"
    ADD CONSTRAINT "curation_results_reddit_channel_id_fkey" FOREIGN KEY ("reddit_channel_id") REFERENCES "public"."reddit_channels"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."curation_results"
    ADD CONSTRAINT "curation_results_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."curations"
    ADD CONSTRAINT "curations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."curations"
    ADD CONSTRAINT "curations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_provider_config"
    ADD CONSTRAINT "email_provider_config_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."admin_users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fund_categories"
    ADD CONSTRAINT "fund_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fund_categories"
    ADD CONSTRAINT "fund_categories_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fund_tags"
    ADD CONSTRAINT "fund_tags_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fund_tags"
    ADD CONSTRAINT "fund_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funds"
    ADD CONSTRAINT "funds_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."influencer_categories"
    ADD CONSTRAINT "influencer_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."influencer_categories"
    ADD CONSTRAINT "influencer_categories_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."influencer_tags"
    ADD CONSTRAINT "influencer_tags_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."influencer_tags"
    ADD CONSTRAINT "influencer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."influencers"
    ADD CONSTRAINT "influencers_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_gateway_config"
    ADD CONSTRAINT "payment_gateway_config_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."admin_users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan_configs"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reddit_channel_categories"
    ADD CONSTRAINT "reddit_channel_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reddit_channel_categories"
    ADD CONSTRAINT "reddit_channel_categories_reddit_channel_id_fkey" FOREIGN KEY ("reddit_channel_id") REFERENCES "public"."reddit_channels"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reddit_channel_tags"
    ADD CONSTRAINT "reddit_channel_tags_reddit_channel_id_fkey" FOREIGN KEY ("reddit_channel_id") REFERENCES "public"."reddit_channels"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reddit_channel_tags"
    ADD CONSTRAINT "reddit_channel_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_leads"
    ADD CONSTRAINT "service_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sub_categories"
    ADD CONSTRAINT "sub_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan_configs"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."website_categories"
    ADD CONSTRAINT "website_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."website_categories"
    ADD CONSTRAINT "website_categories_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."website_tags"
    ADD CONSTRAINT "website_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."website_tags"
    ADD CONSTRAINT "website_tags_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beta_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curation_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_provider_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fund_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fund_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."influencer_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."influencer_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."influencers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_gateway_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processed_stripe_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reddit_channel_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reddit_channel_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reddit_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."website_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."website_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."websites" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."_prisma_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."ai_config" TO "anon";
GRANT ALL ON TABLE "public"."ai_config" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_config" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."beta_config" TO "anon";
GRANT ALL ON TABLE "public"."beta_config" TO "authenticated";
GRANT ALL ON TABLE "public"."beta_config" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."contact_submissions" TO "anon";
GRANT ALL ON TABLE "public"."contact_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."curation_results" TO "anon";
GRANT ALL ON TABLE "public"."curation_results" TO "authenticated";
GRANT ALL ON TABLE "public"."curation_results" TO "service_role";



GRANT ALL ON TABLE "public"."curations" TO "anon";
GRANT ALL ON TABLE "public"."curations" TO "authenticated";
GRANT ALL ON TABLE "public"."curations" TO "service_role";



GRANT ALL ON TABLE "public"."email_provider_config" TO "anon";
GRANT ALL ON TABLE "public"."email_provider_config" TO "authenticated";
GRANT ALL ON TABLE "public"."email_provider_config" TO "service_role";



GRANT ALL ON TABLE "public"."fund_categories" TO "anon";
GRANT ALL ON TABLE "public"."fund_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."fund_categories" TO "service_role";



GRANT ALL ON TABLE "public"."fund_tags" TO "anon";
GRANT ALL ON TABLE "public"."fund_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."fund_tags" TO "service_role";



GRANT ALL ON TABLE "public"."funds" TO "anon";
GRANT ALL ON TABLE "public"."funds" TO "authenticated";
GRANT ALL ON TABLE "public"."funds" TO "service_role";



GRANT ALL ON TABLE "public"."influencer_categories" TO "anon";
GRANT ALL ON TABLE "public"."influencer_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."influencer_categories" TO "service_role";



GRANT ALL ON TABLE "public"."influencer_tags" TO "anon";
GRANT ALL ON TABLE "public"."influencer_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."influencer_tags" TO "service_role";



GRANT ALL ON TABLE "public"."influencers" TO "anon";
GRANT ALL ON TABLE "public"."influencers" TO "authenticated";
GRANT ALL ON TABLE "public"."influencers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payment_gateway_config" TO "anon";
GRANT ALL ON TABLE "public"."payment_gateway_config" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_gateway_config" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."plan_configs" TO "anon";
GRANT ALL ON TABLE "public"."plan_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_configs" TO "service_role";



GRANT ALL ON TABLE "public"."processed_stripe_events" TO "anon";
GRANT ALL ON TABLE "public"."processed_stripe_events" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_stripe_events" TO "service_role";



GRANT ALL ON TABLE "public"."reddit_channel_categories" TO "anon";
GRANT ALL ON TABLE "public"."reddit_channel_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."reddit_channel_categories" TO "service_role";



GRANT ALL ON TABLE "public"."reddit_channel_tags" TO "anon";
GRANT ALL ON TABLE "public"."reddit_channel_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."reddit_channel_tags" TO "service_role";



GRANT ALL ON TABLE "public"."reddit_channels" TO "anon";
GRANT ALL ON TABLE "public"."reddit_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."reddit_channels" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."service_leads" TO "anon";
GRANT ALL ON TABLE "public"."service_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."service_leads" TO "service_role";



GRANT ALL ON TABLE "public"."sub_categories" TO "anon";
GRANT ALL ON TABLE "public"."sub_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_categories" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."website_categories" TO "anon";
GRANT ALL ON TABLE "public"."website_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."website_categories" TO "service_role";



GRANT ALL ON TABLE "public"."website_tags" TO "anon";
GRANT ALL ON TABLE "public"."website_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."website_tags" TO "service_role";



GRANT ALL ON TABLE "public"."websites" TO "anon";
GRANT ALL ON TABLE "public"."websites" TO "authenticated";
GRANT ALL ON TABLE "public"."websites" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































