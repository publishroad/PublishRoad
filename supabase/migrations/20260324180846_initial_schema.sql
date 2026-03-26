create type "public"."AdminRole" as enum ('super_admin', 'admin', 'editor');

create type "public"."AuthProvider" as enum ('email', 'google');

create type "public"."BillingType" as enum ('free', 'one_time', 'monthly', 'lifetime');

create type "public"."BlogStatus" as enum ('draft', 'published');

create type "public"."CurationSection" as enum ('a', 'b', 'c', 'd', 'e', 'f');

create type "public"."CurationStatus" as enum ('pending', 'processing', 'completed', 'failed');

create type "public"."EmailProvider" as enum ('resend', 'smtp', 'sendgrid', 'ses');

create type "public"."LeadStatus" as enum ('new', 'contacted', 'closed');

create type "public"."PaymentProvider" as enum ('stripe', 'razorpay', 'paypal');

create type "public"."PaymentStatus" as enum ('pending', 'completed', 'failed', 'refunded');

create type "public"."UserResultStatus" as enum ('saved', 'hidden');

create type "public"."WebsiteType" as enum ('distribution', 'guest_post', 'press_release');


  create table "public"."_prisma_migrations" (
    "id" character varying(36) not null,
    "checksum" character varying(64) not null,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) not null,
    "logs" text,
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone not null default now(),
    "applied_steps_count" integer not null default 0
      );



  create table "public"."admin_users" (
    "id" text not null,
    "email" text not null,
    "name" text not null,
    "password_hash" text not null,
    "totp_secret" text,
    "totp_enabled" boolean not null default false,
    "backup_codes" jsonb not null default '[]'::jsonb,
    "role" public."AdminRole" not null default 'admin'::public."AdminRole",
    "is_active" boolean not null default true,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."ai_config" (
    "id" text not null default 'default'::text,
    "base_url" text not null,
    "api_key" text not null,
    "model_name" text not null,
    "max_tokens" integer not null default 4096,
    "temperature" double precision not null default 0.3,
    "updated_at" timestamp(3) without time zone not null,
    "updated_by_id" text
      );



  create table "public"."audit_logs" (
    "id" text not null,
    "admin_id" text not null,
    "action" text not null,
    "entity" text not null,
    "entity_id" text not null,
    "old_data" jsonb,
    "new_data" jsonb,
    "ip" text,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."blog_posts" (
    "id" text not null,
    "slug" text not null,
    "title" text not null,
    "excerpt" text,
    "content" text not null,
    "featured_image" text,
    "category_id" text,
    "author_id" text not null,
    "status" public."BlogStatus" not null default 'draft'::public."BlogStatus",
    "publish_date" timestamp(3) without time zone,
    "meta_title" text,
    "meta_description" text,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."categories" (
    "id" text not null,
    "name" text not null,
    "slug" text not null,
    "description" text,
    "is_active" boolean not null default true,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."contact_submissions" (
    "id" text not null,
    "name" text not null,
    "email" text not null,
    "subject" text not null,
    "message" text not null,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."countries" (
    "id" text not null,
    "name" text not null,
    "slug" text not null,
    "flag_emoji" text,
    "is_active" boolean not null default true,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."curation_results" (
    "id" text not null,
    "curation_id" text not null,
    "website_id" text not null,
    "match_score" double precision not null,
    "match_reason" text,
    "section" public."CurationSection" not null,
    "rank" integer not null,
    "user_status" public."UserResultStatus",
    "user_notes" text,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."curations" (
    "id" text not null,
    "user_id" text not null,
    "product_url" text not null,
    "country_id" text,
    "keywords" text[] default ARRAY[]::text[],
    "description" text,
    "status" public."CurationStatus" not null default 'pending'::public."CurationStatus",
    "error_message" text,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."email_provider_config" (
    "id" text not null default 'default'::text,
    "provider" public."EmailProvider" not null default 'resend'::public."EmailProvider",
    "from_address" text not null default 'PublishRoad <noreply@publishroad.com>'::text,
    "api_key" text,
    "host" text,
    "port" integer,
    "username" text,
    "password" text,
    "use_tls" boolean not null default true,
    "additional_config" jsonb not null default '{}'::jsonb,
    "updated_at" timestamp(3) without time zone not null,
    "updated_by_id" text
      );



  create table "public"."notifications" (
    "id" text not null,
    "user_id" text not null,
    "type" text not null,
    "title" text not null,
    "message" text not null,
    "is_read" boolean not null default false,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."payment_gateway_config" (
    "id" text not null default 'default'::text,
    "provider" public."PaymentProvider" not null default 'stripe'::public."PaymentProvider",
    "public_key" text,
    "secret_key" text,
    "webhook_secret" text,
    "additional_config" jsonb not null default '{}'::jsonb,
    "updated_at" timestamp(3) without time zone not null,
    "updated_by_id" text
      );



  create table "public"."payments" (
    "id" text not null,
    "user_id" text not null,
    "plan_id" text,
    "stripe_payment_intent_id" text,
    "stripe_subscription_id" text,
    "stripe_invoice_id" text,
    "amount_cents" integer not null,
    "currency" text not null default 'usd'::text,
    "status" public."PaymentStatus" not null default 'pending'::public."PaymentStatus",
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."plan_configs" (
    "id" text not null,
    "name" text not null,
    "slug" text not null,
    "price_cents" integer not null,
    "credits" integer not null,
    "billing_type" public."BillingType" not null,
    "stripe_price_id" text,
    "features" jsonb not null default '[]'::jsonb,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."processed_stripe_events" (
    "event_id" text not null,
    "processed_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."referrals" (
    "id" text not null,
    "referrer_user_id" text not null,
    "referred_user_id" text,
    "code" text not null,
    "status" text not null default 'pending'::text,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP
      );



  create table "public"."service_leads" (
    "id" text not null,
    "user_id" text,
    "name" text not null,
    "email" text not null,
    "phone" text,
    "website_url" text,
    "service_type" text,
    "message" text,
    "status" public."LeadStatus" not null default 'new'::public."LeadStatus",
    "notes" text,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."sub_categories" (
    "id" text not null,
    "category_id" text not null,
    "name" text not null,
    "slug" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."tags" (
    "id" text not null,
    "name" text not null,
    "slug" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null
      );



  create table "public"."users" (
    "id" text not null,
    "email" text not null,
    "name" text,
    "password_hash" text,
    "auth_provider" public."AuthProvider" not null default 'email'::public."AuthProvider",
    "plan_id" text,
    "credits_remaining" integer not null default 1,
    "stripe_customer_id" text,
    "email_verified_at" timestamp(3) without time zone,
    "email_verify_token" text,
    "reset_token" text,
    "reset_token_expiry" timestamp(3) without time zone,
    "failed_login_count" integer not null default 0,
    "locked_until" timestamp(3) without time zone,
    "deleted_at" timestamp(3) without time zone,
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null,
    "stripe_customer_hash" text
      );



  create table "public"."website_tags" (
    "website_id" text not null,
    "tag_id" text not null
      );



  create table "public"."websites" (
    "id" text not null,
    "name" text not null,
    "url" text not null,
    "type" public."WebsiteType" not null,
    "da" integer not null default 0,
    "country_id" text,
    "category_id" text,
    "sub_category_id" text,
    "description" text,
    "submission_url" text,
    "is_active" boolean not null default true,
    "is_pinned" boolean not null default false,
    "is_excluded" boolean not null default false,
    "tag_slugs" text[] default ARRAY[]::text[],
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null,
    "pa" integer not null default 0,
    "spam_score" integer not null default 0,
    "traffic" integer not null default 0
      );


CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id);

CREATE UNIQUE INDEX admin_users_email_key ON public.admin_users USING btree (email);

CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (id);

CREATE UNIQUE INDEX ai_config_pkey ON public.ai_config USING btree (id);

CREATE INDEX audit_logs_admin_id_created_at_idx ON public.audit_logs USING btree (admin_id, created_at DESC);

CREATE INDEX audit_logs_entity_entity_id_idx ON public.audit_logs USING btree (entity, entity_id);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX blog_posts_pkey ON public.blog_posts USING btree (id);

CREATE UNIQUE INDEX blog_posts_slug_key ON public.blog_posts USING btree (slug);

CREATE INDEX blog_posts_status_publish_date_idx ON public.blog_posts USING btree (status, publish_date DESC);

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);

CREATE UNIQUE INDEX contact_submissions_pkey ON public.contact_submissions USING btree (id);

CREATE UNIQUE INDEX countries_name_key ON public.countries USING btree (name);

CREATE UNIQUE INDEX countries_pkey ON public.countries USING btree (id);

CREATE UNIQUE INDEX countries_slug_key ON public.countries USING btree (slug);

CREATE INDEX curation_results_curation_id_section_rank_idx ON public.curation_results USING btree (curation_id, section, rank);

CREATE UNIQUE INDEX curation_results_pkey ON public.curation_results USING btree (id);

CREATE UNIQUE INDEX curations_pkey ON public.curations USING btree (id);

CREATE INDEX curations_user_id_created_at_idx ON public.curations USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX email_provider_config_pkey ON public.email_provider_config USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_user_id_is_read_created_at_idx ON public.notifications USING btree (user_id, is_read, created_at DESC);

CREATE UNIQUE INDEX payment_gateway_config_pkey ON public.payment_gateway_config USING btree (id);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE UNIQUE INDEX plan_configs_pkey ON public.plan_configs USING btree (id);

CREATE UNIQUE INDEX plan_configs_slug_key ON public.plan_configs USING btree (slug);

CREATE UNIQUE INDEX processed_stripe_events_pkey ON public.processed_stripe_events USING btree (event_id);

CREATE UNIQUE INDEX referrals_code_key ON public.referrals USING btree (code);

CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id);

CREATE UNIQUE INDEX service_leads_pkey ON public.service_leads USING btree (id);

CREATE UNIQUE INDEX sub_categories_pkey ON public.sub_categories USING btree (id);

CREATE UNIQUE INDEX sub_categories_slug_key ON public.sub_categories USING btree (slug);

CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE UNIQUE INDEX tags_slug_key ON public.tags USING btree (slug);

CREATE INDEX users_email_idx ON public.users USING btree (email);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE INDEX users_stripe_customer_hash_idx ON public.users USING btree (stripe_customer_hash);

CREATE UNIQUE INDEX website_tags_pkey ON public.website_tags USING btree (website_id, tag_id);

CREATE INDEX websites_country_id_is_active_idx ON public.websites USING btree (country_id, is_active);

CREATE UNIQUE INDEX websites_pkey ON public.websites USING btree (id);

CREATE INDEX websites_type_is_active_idx ON public.websites USING btree (type, is_active);

CREATE UNIQUE INDEX websites_url_key ON public.websites USING btree (url);

alter table "public"."_prisma_migrations" add constraint "_prisma_migrations_pkey" PRIMARY KEY using index "_prisma_migrations_pkey";

alter table "public"."admin_users" add constraint "admin_users_pkey" PRIMARY KEY using index "admin_users_pkey";

alter table "public"."ai_config" add constraint "ai_config_pkey" PRIMARY KEY using index "ai_config_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."blog_posts" add constraint "blog_posts_pkey" PRIMARY KEY using index "blog_posts_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."contact_submissions" add constraint "contact_submissions_pkey" PRIMARY KEY using index "contact_submissions_pkey";

alter table "public"."countries" add constraint "countries_pkey" PRIMARY KEY using index "countries_pkey";

alter table "public"."curation_results" add constraint "curation_results_pkey" PRIMARY KEY using index "curation_results_pkey";

alter table "public"."curations" add constraint "curations_pkey" PRIMARY KEY using index "curations_pkey";

alter table "public"."email_provider_config" add constraint "email_provider_config_pkey" PRIMARY KEY using index "email_provider_config_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."payment_gateway_config" add constraint "payment_gateway_config_pkey" PRIMARY KEY using index "payment_gateway_config_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."plan_configs" add constraint "plan_configs_pkey" PRIMARY KEY using index "plan_configs_pkey";

alter table "public"."processed_stripe_events" add constraint "processed_stripe_events_pkey" PRIMARY KEY using index "processed_stripe_events_pkey";

alter table "public"."referrals" add constraint "referrals_pkey" PRIMARY KEY using index "referrals_pkey";

alter table "public"."service_leads" add constraint "service_leads_pkey" PRIMARY KEY using index "service_leads_pkey";

alter table "public"."sub_categories" add constraint "sub_categories_pkey" PRIMARY KEY using index "sub_categories_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."website_tags" add constraint "website_tags_pkey" PRIMARY KEY using index "website_tags_pkey";

alter table "public"."websites" add constraint "websites_pkey" PRIMARY KEY using index "websites_pkey";

alter table "public"."ai_config" add constraint "ai_config_updated_by_id_fkey" FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."ai_config" validate constraint "ai_config_updated_by_id_fkey";

alter table "public"."audit_logs" add constraint "audit_logs_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_admin_id_fkey";

alter table "public"."blog_posts" add constraint "blog_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.admin_users(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."blog_posts" validate constraint "blog_posts_author_id_fkey";

alter table "public"."blog_posts" add constraint "blog_posts_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."blog_posts" validate constraint "blog_posts_category_id_fkey";

alter table "public"."curation_results" add constraint "curation_results_curation_id_fkey" FOREIGN KEY (curation_id) REFERENCES public.curations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."curation_results" validate constraint "curation_results_curation_id_fkey";

alter table "public"."curation_results" add constraint "curation_results_website_id_fkey" FOREIGN KEY (website_id) REFERENCES public.websites(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."curation_results" validate constraint "curation_results_website_id_fkey";

alter table "public"."curations" add constraint "curations_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."curations" validate constraint "curations_country_id_fkey";

alter table "public"."curations" add constraint "curations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."curations" validate constraint "curations_user_id_fkey";

alter table "public"."email_provider_config" add constraint "email_provider_config_updated_by_id_fkey" FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."email_provider_config" validate constraint "email_provider_config_updated_by_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."payment_gateway_config" add constraint "payment_gateway_config_updated_by_id_fkey" FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."payment_gateway_config" validate constraint "payment_gateway_config_updated_by_id_fkey";

alter table "public"."payments" add constraint "payments_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.plan_configs(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."payments" validate constraint "payments_plan_id_fkey";

alter table "public"."payments" add constraint "payments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."payments" validate constraint "payments_user_id_fkey";

alter table "public"."referrals" add constraint "referrals_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."referrals" validate constraint "referrals_referred_user_id_fkey";

alter table "public"."referrals" add constraint "referrals_referrer_user_id_fkey" FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."referrals" validate constraint "referrals_referrer_user_id_fkey";

alter table "public"."service_leads" add constraint "service_leads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."service_leads" validate constraint "service_leads_user_id_fkey";

alter table "public"."sub_categories" add constraint "sub_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."sub_categories" validate constraint "sub_categories_category_id_fkey";

alter table "public"."users" add constraint "users_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.plan_configs(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_plan_id_fkey";

alter table "public"."website_tags" add constraint "website_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."website_tags" validate constraint "website_tags_tag_id_fkey";

alter table "public"."website_tags" add constraint "website_tags_website_id_fkey" FOREIGN KEY (website_id) REFERENCES public.websites(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."website_tags" validate constraint "website_tags_website_id_fkey";

alter table "public"."websites" add constraint "websites_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."websites" validate constraint "websites_category_id_fkey";

alter table "public"."websites" add constraint "websites_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."websites" validate constraint "websites_country_id_fkey";

alter table "public"."websites" add constraint "websites_sub_category_id_fkey" FOREIGN KEY (sub_category_id) REFERENCES public.sub_categories(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."websites" validate constraint "websites_sub_category_id_fkey";

grant delete on table "public"."_prisma_migrations" to "anon";

grant insert on table "public"."_prisma_migrations" to "anon";

grant references on table "public"."_prisma_migrations" to "anon";

grant select on table "public"."_prisma_migrations" to "anon";

grant trigger on table "public"."_prisma_migrations" to "anon";

grant truncate on table "public"."_prisma_migrations" to "anon";

grant update on table "public"."_prisma_migrations" to "anon";

grant delete on table "public"."_prisma_migrations" to "authenticated";

grant insert on table "public"."_prisma_migrations" to "authenticated";

grant references on table "public"."_prisma_migrations" to "authenticated";

grant select on table "public"."_prisma_migrations" to "authenticated";

grant trigger on table "public"."_prisma_migrations" to "authenticated";

grant truncate on table "public"."_prisma_migrations" to "authenticated";

grant update on table "public"."_prisma_migrations" to "authenticated";

grant delete on table "public"."_prisma_migrations" to "service_role";

grant insert on table "public"."_prisma_migrations" to "service_role";

grant references on table "public"."_prisma_migrations" to "service_role";

grant select on table "public"."_prisma_migrations" to "service_role";

grant trigger on table "public"."_prisma_migrations" to "service_role";

grant truncate on table "public"."_prisma_migrations" to "service_role";

grant update on table "public"."_prisma_migrations" to "service_role";


grant delete on table "public"."admin_users" to "authenticated";

grant insert on table "public"."admin_users" to "authenticated";

grant references on table "public"."admin_users" to "authenticated";

grant select on table "public"."admin_users" to "authenticated";

grant trigger on table "public"."admin_users" to "authenticated";

grant truncate on table "public"."admin_users" to "authenticated";

grant update on table "public"."admin_users" to "authenticated";

revoke delete on table "public"."admin_users" from "authenticated";

revoke insert on table "public"."admin_users" from "authenticated";

revoke references on table "public"."admin_users" from "authenticated";

revoke trigger on table "public"."admin_users" from "authenticated";

revoke truncate on table "public"."admin_users" from "authenticated";

revoke update on table "public"."admin_users" from "authenticated";

grant delete on table "public"."admin_users" to "service_role";

grant insert on table "public"."admin_users" to "service_role";

grant references on table "public"."admin_users" to "service_role";

grant select on table "public"."admin_users" to "service_role";

grant trigger on table "public"."admin_users" to "service_role";

grant truncate on table "public"."admin_users" to "service_role";

grant update on table "public"."admin_users" to "service_role";


grant delete on table "public"."ai_config" to "authenticated";

grant insert on table "public"."ai_config" to "authenticated";

grant references on table "public"."ai_config" to "authenticated";

grant select on table "public"."ai_config" to "authenticated";

grant trigger on table "public"."ai_config" to "authenticated";

grant truncate on table "public"."ai_config" to "authenticated";

grant update on table "public"."ai_config" to "authenticated";

revoke delete on table "public"."ai_config" from "authenticated";

revoke insert on table "public"."ai_config" from "authenticated";

revoke references on table "public"."ai_config" from "authenticated";

revoke trigger on table "public"."ai_config" from "authenticated";

revoke truncate on table "public"."ai_config" from "authenticated";

revoke update on table "public"."ai_config" from "authenticated";

grant delete on table "public"."ai_config" to "service_role";

grant insert on table "public"."ai_config" to "service_role";

grant references on table "public"."ai_config" to "service_role";

grant select on table "public"."ai_config" to "service_role";

grant trigger on table "public"."ai_config" to "service_role";

grant truncate on table "public"."ai_config" to "service_role";

grant update on table "public"."ai_config" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."blog_posts" to "anon";

grant insert on table "public"."blog_posts" to "anon";

grant references on table "public"."blog_posts" to "anon";

grant select on table "public"."blog_posts" to "anon";

grant trigger on table "public"."blog_posts" to "anon";

grant truncate on table "public"."blog_posts" to "anon";

grant update on table "public"."blog_posts" to "anon";

grant delete on table "public"."blog_posts" to "authenticated";

grant insert on table "public"."blog_posts" to "authenticated";

grant references on table "public"."blog_posts" to "authenticated";

grant select on table "public"."blog_posts" to "authenticated";

grant trigger on table "public"."blog_posts" to "authenticated";

grant truncate on table "public"."blog_posts" to "authenticated";

grant update on table "public"."blog_posts" to "authenticated";

grant delete on table "public"."blog_posts" to "service_role";

grant insert on table "public"."blog_posts" to "service_role";

grant references on table "public"."blog_posts" to "service_role";

grant select on table "public"."blog_posts" to "service_role";

grant trigger on table "public"."blog_posts" to "service_role";

grant truncate on table "public"."blog_posts" to "service_role";

grant update on table "public"."blog_posts" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."contact_submissions" to "anon";

grant insert on table "public"."contact_submissions" to "anon";

grant references on table "public"."contact_submissions" to "anon";

grant select on table "public"."contact_submissions" to "anon";

grant trigger on table "public"."contact_submissions" to "anon";

grant truncate on table "public"."contact_submissions" to "anon";

grant update on table "public"."contact_submissions" to "anon";

grant delete on table "public"."contact_submissions" to "authenticated";

grant insert on table "public"."contact_submissions" to "authenticated";

grant references on table "public"."contact_submissions" to "authenticated";

grant select on table "public"."contact_submissions" to "authenticated";

grant trigger on table "public"."contact_submissions" to "authenticated";

grant truncate on table "public"."contact_submissions" to "authenticated";

grant update on table "public"."contact_submissions" to "authenticated";

grant delete on table "public"."contact_submissions" to "service_role";

grant insert on table "public"."contact_submissions" to "service_role";

grant references on table "public"."contact_submissions" to "service_role";

grant select on table "public"."contact_submissions" to "service_role";

grant trigger on table "public"."contact_submissions" to "service_role";

grant truncate on table "public"."contact_submissions" to "service_role";

grant update on table "public"."contact_submissions" to "service_role";

grant delete on table "public"."countries" to "anon";

grant insert on table "public"."countries" to "anon";

grant references on table "public"."countries" to "anon";

grant select on table "public"."countries" to "anon";

grant trigger on table "public"."countries" to "anon";

grant truncate on table "public"."countries" to "anon";

grant update on table "public"."countries" to "anon";

grant delete on table "public"."countries" to "authenticated";

grant insert on table "public"."countries" to "authenticated";

grant references on table "public"."countries" to "authenticated";

grant select on table "public"."countries" to "authenticated";

grant trigger on table "public"."countries" to "authenticated";

grant truncate on table "public"."countries" to "authenticated";

grant update on table "public"."countries" to "authenticated";

grant delete on table "public"."countries" to "service_role";

grant insert on table "public"."countries" to "service_role";

grant references on table "public"."countries" to "service_role";

grant select on table "public"."countries" to "service_role";

grant trigger on table "public"."countries" to "service_role";

grant truncate on table "public"."countries" to "service_role";

grant update on table "public"."countries" to "service_role";

grant delete on table "public"."curation_results" to "anon";

grant insert on table "public"."curation_results" to "anon";

grant references on table "public"."curation_results" to "anon";

grant select on table "public"."curation_results" to "anon";

grant trigger on table "public"."curation_results" to "anon";

grant truncate on table "public"."curation_results" to "anon";

grant update on table "public"."curation_results" to "anon";

grant delete on table "public"."curation_results" to "authenticated";

grant insert on table "public"."curation_results" to "authenticated";

grant references on table "public"."curation_results" to "authenticated";

grant select on table "public"."curation_results" to "authenticated";

grant trigger on table "public"."curation_results" to "authenticated";

grant truncate on table "public"."curation_results" to "authenticated";

grant update on table "public"."curation_results" to "authenticated";

grant delete on table "public"."curation_results" to "service_role";

grant insert on table "public"."curation_results" to "service_role";

grant references on table "public"."curation_results" to "service_role";

grant select on table "public"."curation_results" to "service_role";

grant trigger on table "public"."curation_results" to "service_role";

grant truncate on table "public"."curation_results" to "service_role";

grant update on table "public"."curation_results" to "service_role";

grant delete on table "public"."curations" to "anon";

grant insert on table "public"."curations" to "anon";

grant references on table "public"."curations" to "anon";

grant select on table "public"."curations" to "anon";

grant trigger on table "public"."curations" to "anon";

grant truncate on table "public"."curations" to "anon";

grant update on table "public"."curations" to "anon";

grant delete on table "public"."curations" to "authenticated";

grant insert on table "public"."curations" to "authenticated";

grant references on table "public"."curations" to "authenticated";

grant select on table "public"."curations" to "authenticated";

grant trigger on table "public"."curations" to "authenticated";

grant truncate on table "public"."curations" to "authenticated";

grant update on table "public"."curations" to "authenticated";

grant delete on table "public"."curations" to "service_role";

grant insert on table "public"."curations" to "service_role";

grant references on table "public"."curations" to "service_role";

grant select on table "public"."curations" to "service_role";

grant trigger on table "public"."curations" to "service_role";

grant truncate on table "public"."curations" to "service_role";

grant update on table "public"."curations" to "service_role";

grant delete on table "public"."email_provider_config" to "anon";

grant insert on table "public"."email_provider_config" to "anon";

grant references on table "public"."email_provider_config" to "anon";

grant select on table "public"."email_provider_config" to "anon";

grant trigger on table "public"."email_provider_config" to "anon";

grant truncate on table "public"."email_provider_config" to "anon";

grant update on table "public"."email_provider_config" to "anon";

grant delete on table "public"."email_provider_config" to "authenticated";

grant insert on table "public"."email_provider_config" to "authenticated";

grant references on table "public"."email_provider_config" to "authenticated";

grant select on table "public"."email_provider_config" to "authenticated";

grant trigger on table "public"."email_provider_config" to "authenticated";

grant truncate on table "public"."email_provider_config" to "authenticated";

grant update on table "public"."email_provider_config" to "authenticated";

grant delete on table "public"."email_provider_config" to "service_role";

grant insert on table "public"."email_provider_config" to "service_role";

grant references on table "public"."email_provider_config" to "service_role";

grant select on table "public"."email_provider_config" to "service_role";

grant trigger on table "public"."email_provider_config" to "service_role";

grant truncate on table "public"."email_provider_config" to "service_role";

grant update on table "public"."email_provider_config" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."payment_gateway_config" to "anon";

grant insert on table "public"."payment_gateway_config" to "anon";

grant references on table "public"."payment_gateway_config" to "anon";

grant select on table "public"."payment_gateway_config" to "anon";

grant trigger on table "public"."payment_gateway_config" to "anon";

grant truncate on table "public"."payment_gateway_config" to "anon";

grant update on table "public"."payment_gateway_config" to "anon";

grant delete on table "public"."payment_gateway_config" to "authenticated";

grant insert on table "public"."payment_gateway_config" to "authenticated";

grant references on table "public"."payment_gateway_config" to "authenticated";

grant select on table "public"."payment_gateway_config" to "authenticated";

grant trigger on table "public"."payment_gateway_config" to "authenticated";

grant truncate on table "public"."payment_gateway_config" to "authenticated";

grant update on table "public"."payment_gateway_config" to "authenticated";

grant delete on table "public"."payment_gateway_config" to "service_role";

grant insert on table "public"."payment_gateway_config" to "service_role";

grant references on table "public"."payment_gateway_config" to "service_role";

grant select on table "public"."payment_gateway_config" to "service_role";

grant trigger on table "public"."payment_gateway_config" to "service_role";

grant truncate on table "public"."payment_gateway_config" to "service_role";

grant update on table "public"."payment_gateway_config" to "service_role";


grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

revoke delete on table "public"."payments" from "authenticated";

revoke insert on table "public"."payments" from "authenticated";

revoke references on table "public"."payments" from "authenticated";

revoke trigger on table "public"."payments" from "authenticated";

revoke truncate on table "public"."payments" from "authenticated";

revoke update on table "public"."payments" from "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."plan_configs" to "anon";

grant insert on table "public"."plan_configs" to "anon";

grant references on table "public"."plan_configs" to "anon";

grant select on table "public"."plan_configs" to "anon";

grant trigger on table "public"."plan_configs" to "anon";

grant truncate on table "public"."plan_configs" to "anon";

grant update on table "public"."plan_configs" to "anon";

grant delete on table "public"."plan_configs" to "authenticated";

grant insert on table "public"."plan_configs" to "authenticated";

grant references on table "public"."plan_configs" to "authenticated";

grant select on table "public"."plan_configs" to "authenticated";

grant trigger on table "public"."plan_configs" to "authenticated";

grant truncate on table "public"."plan_configs" to "authenticated";

grant update on table "public"."plan_configs" to "authenticated";

grant delete on table "public"."plan_configs" to "service_role";

grant insert on table "public"."plan_configs" to "service_role";

grant references on table "public"."plan_configs" to "service_role";

grant select on table "public"."plan_configs" to "service_role";

grant trigger on table "public"."plan_configs" to "service_role";

grant truncate on table "public"."plan_configs" to "service_role";

grant update on table "public"."plan_configs" to "service_role";

grant delete on table "public"."processed_stripe_events" to "anon";

grant insert on table "public"."processed_stripe_events" to "anon";

grant references on table "public"."processed_stripe_events" to "anon";

grant select on table "public"."processed_stripe_events" to "anon";

grant trigger on table "public"."processed_stripe_events" to "anon";

grant truncate on table "public"."processed_stripe_events" to "anon";

grant update on table "public"."processed_stripe_events" to "anon";

grant delete on table "public"."processed_stripe_events" to "authenticated";

grant insert on table "public"."processed_stripe_events" to "authenticated";

grant references on table "public"."processed_stripe_events" to "authenticated";

grant select on table "public"."processed_stripe_events" to "authenticated";

grant trigger on table "public"."processed_stripe_events" to "authenticated";

grant truncate on table "public"."processed_stripe_events" to "authenticated";

grant update on table "public"."processed_stripe_events" to "authenticated";

grant delete on table "public"."processed_stripe_events" to "service_role";

grant insert on table "public"."processed_stripe_events" to "service_role";

grant references on table "public"."processed_stripe_events" to "service_role";

grant select on table "public"."processed_stripe_events" to "service_role";

grant trigger on table "public"."processed_stripe_events" to "service_role";

grant truncate on table "public"."processed_stripe_events" to "service_role";

grant update on table "public"."processed_stripe_events" to "service_role";

grant delete on table "public"."referrals" to "anon";

grant insert on table "public"."referrals" to "anon";

grant references on table "public"."referrals" to "anon";

grant select on table "public"."referrals" to "anon";

grant trigger on table "public"."referrals" to "anon";

grant truncate on table "public"."referrals" to "anon";

grant update on table "public"."referrals" to "anon";

grant delete on table "public"."referrals" to "authenticated";

grant insert on table "public"."referrals" to "authenticated";

grant references on table "public"."referrals" to "authenticated";

grant select on table "public"."referrals" to "authenticated";

grant trigger on table "public"."referrals" to "authenticated";

grant truncate on table "public"."referrals" to "authenticated";

grant update on table "public"."referrals" to "authenticated";

grant delete on table "public"."referrals" to "service_role";

grant insert on table "public"."referrals" to "service_role";

grant references on table "public"."referrals" to "service_role";

grant select on table "public"."referrals" to "service_role";

grant trigger on table "public"."referrals" to "service_role";

grant truncate on table "public"."referrals" to "service_role";

grant update on table "public"."referrals" to "service_role";

grant delete on table "public"."service_leads" to "anon";

grant insert on table "public"."service_leads" to "anon";

grant references on table "public"."service_leads" to "anon";

grant select on table "public"."service_leads" to "anon";

grant trigger on table "public"."service_leads" to "anon";

grant truncate on table "public"."service_leads" to "anon";

grant update on table "public"."service_leads" to "anon";

grant delete on table "public"."service_leads" to "authenticated";

grant insert on table "public"."service_leads" to "authenticated";

grant references on table "public"."service_leads" to "authenticated";

grant select on table "public"."service_leads" to "authenticated";

grant trigger on table "public"."service_leads" to "authenticated";

grant truncate on table "public"."service_leads" to "authenticated";

grant update on table "public"."service_leads" to "authenticated";

grant delete on table "public"."service_leads" to "service_role";

grant insert on table "public"."service_leads" to "service_role";

grant references on table "public"."service_leads" to "service_role";

grant select on table "public"."service_leads" to "service_role";

grant trigger on table "public"."service_leads" to "service_role";

grant truncate on table "public"."service_leads" to "service_role";

grant update on table "public"."service_leads" to "service_role";

grant delete on table "public"."sub_categories" to "anon";

grant insert on table "public"."sub_categories" to "anon";

grant references on table "public"."sub_categories" to "anon";

grant select on table "public"."sub_categories" to "anon";

grant trigger on table "public"."sub_categories" to "anon";

grant truncate on table "public"."sub_categories" to "anon";

grant update on table "public"."sub_categories" to "anon";

grant delete on table "public"."sub_categories" to "authenticated";

grant insert on table "public"."sub_categories" to "authenticated";

grant references on table "public"."sub_categories" to "authenticated";

grant select on table "public"."sub_categories" to "authenticated";

grant trigger on table "public"."sub_categories" to "authenticated";

grant truncate on table "public"."sub_categories" to "authenticated";

grant update on table "public"."sub_categories" to "authenticated";

grant delete on table "public"."sub_categories" to "service_role";

grant insert on table "public"."sub_categories" to "service_role";

grant references on table "public"."sub_categories" to "service_role";

grant select on table "public"."sub_categories" to "service_role";

grant trigger on table "public"."sub_categories" to "service_role";

grant truncate on table "public"."sub_categories" to "service_role";

grant update on table "public"."sub_categories" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant delete on table "public"."tags" to "authenticated";

grant insert on table "public"."tags" to "authenticated";

grant references on table "public"."tags" to "authenticated";

grant select on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant update on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";


grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."website_tags" to "anon";

grant insert on table "public"."website_tags" to "anon";

grant references on table "public"."website_tags" to "anon";

grant select on table "public"."website_tags" to "anon";

grant trigger on table "public"."website_tags" to "anon";

grant truncate on table "public"."website_tags" to "anon";

grant update on table "public"."website_tags" to "anon";

grant delete on table "public"."website_tags" to "authenticated";

grant insert on table "public"."website_tags" to "authenticated";

grant references on table "public"."website_tags" to "authenticated";

grant select on table "public"."website_tags" to "authenticated";

grant trigger on table "public"."website_tags" to "authenticated";

grant truncate on table "public"."website_tags" to "authenticated";

grant update on table "public"."website_tags" to "authenticated";

grant delete on table "public"."website_tags" to "service_role";

grant insert on table "public"."website_tags" to "service_role";

grant references on table "public"."website_tags" to "service_role";

grant select on table "public"."website_tags" to "service_role";

grant trigger on table "public"."website_tags" to "service_role";

grant truncate on table "public"."website_tags" to "service_role";

grant update on table "public"."website_tags" to "service_role";

grant delete on table "public"."websites" to "anon";

grant insert on table "public"."websites" to "anon";

grant references on table "public"."websites" to "anon";

grant select on table "public"."websites" to "anon";

grant trigger on table "public"."websites" to "anon";

grant truncate on table "public"."websites" to "anon";

grant update on table "public"."websites" to "anon";

grant delete on table "public"."websites" to "authenticated";

grant insert on table "public"."websites" to "authenticated";

grant references on table "public"."websites" to "authenticated";

grant select on table "public"."websites" to "authenticated";

grant trigger on table "public"."websites" to "authenticated";

grant truncate on table "public"."websites" to "authenticated";

grant update on table "public"."websites" to "authenticated";

grant delete on table "public"."websites" to "service_role";

grant insert on table "public"."websites" to "service_role";

grant references on table "public"."websites" to "service_role";

grant select on table "public"."websites" to "service_role";

grant trigger on table "public"."websites" to "service_role";

grant truncate on table "public"."websites" to "service_role";

grant update on table "public"."websites" to "service_role";


