create type "public"."InfluencerPlatform" as enum ('tiktok', 'instagram', 'youtube', 'twitter');

create type "public"."InvestmentStage" as enum ('pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'growth', 'late_stage');

create type "public"."PostingDifficulty" as enum ('easy', 'medium', 'hard');

alter table "public"."curation_results" drop constraint "curation_results_website_id_fkey";

alter type "public"."CurationSection" rename to "CurationSection__old_version_to_be_dropped";

create type "public"."CurationSection" as enum ('a', 'b', 'c', 'd', 'e', 'f');


  create table "public"."beta_config" (
    "id" text not null default 'default'::text,
    "enabled" boolean not null default false,
    "updated_at" timestamp(3) without time zone not null,
    "updated_by_id" text
      );



  create table "public"."fund_categories" (
    "fund_id" text not null,
    "category_id" text not null
      );



  create table "public"."fund_tags" (
    "fund_id" text not null,
    "tag_id" text not null
      );



  create table "public"."funds" (
    "id" text not null,
    "name" text not null,
    "logo_url" text,
    "website_url" text not null,
    "description" text,
    "investment_stage" public."InvestmentStage",
    "ticket_size" text,
    "country_id" text,
    "is_active" boolean not null default true,
    "tag_slugs" text[] default ARRAY[]::text[],
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null,
    "category_slugs" text[] default ARRAY[]::text[]
      );



  create table "public"."influencer_categories" (
    "influencer_id" text not null,
    "category_id" text not null
      );



  create table "public"."influencer_tags" (
    "influencer_id" text not null,
    "tag_id" text not null
      );



  create table "public"."influencers" (
    "id" text not null,
    "name" text not null,
    "platform" public."InfluencerPlatform" not null,
    "followers_count" integer not null default 0,
    "country_id" text,
    "description" text,
    "profile_link" text not null,
    "email" text,
    "is_active" boolean not null default true,
    "tag_slugs" text[] default ARRAY[]::text[],
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null,
    "category_slugs" text[] default ARRAY[]::text[]
      );



  create table "public"."reddit_channel_categories" (
    "reddit_channel_id" text not null,
    "category_id" text not null
      );



  create table "public"."reddit_channel_tags" (
    "reddit_channel_id" text not null,
    "tag_id" text not null
      );



  create table "public"."reddit_channels" (
    "id" text not null,
    "name" text not null,
    "url" text not null,
    "weekly_visitors" integer not null default 0,
    "total_members" integer not null default 0,
    "description" text,
    "posting_difficulty" public."PostingDifficulty",
    "is_active" boolean not null default true,
    "tag_slugs" text[] default ARRAY[]::text[],
    "created_at" timestamp(3) without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) without time zone not null,
    "category_slugs" text[] default ARRAY[]::text[]
      );



  create table "public"."website_categories" (
    "website_id" text not null,
    "category_id" text not null
      );


alter table "public"."curation_results" alter column section type "public"."CurationSection" using section::text::"public"."CurationSection";

alter table "public"."payment_gateway_config" alter column provider type "public"."PaymentProvider" using provider::text::"public"."PaymentProvider";

drop type "public"."CurationSection__old_version_to_be_dropped";

alter table "public"."curation_results" add column "fund_id" text;

alter table "public"."curation_results" add column "influencer_id" text;

alter table "public"."curation_results" add column "reddit_channel_id" text;

alter table "public"."curation_results" alter column "website_id" drop not null;

alter table "public"."email_provider_config" alter column "from_address" drop default;

alter table "public"."payment_gateway_config" add column "is_active" boolean not null default false;

alter table "public"."payment_gateway_config" alter column "id" drop default;

alter table "public"."payment_gateway_config" alter column "provider" drop default;

CREATE UNIQUE INDEX beta_config_pkey ON public.beta_config USING btree (id);

CREATE UNIQUE INDEX fund_categories_pkey ON public.fund_categories USING btree (fund_id, category_id);

CREATE UNIQUE INDEX fund_tags_pkey ON public.fund_tags USING btree (fund_id, tag_id);

CREATE UNIQUE INDEX funds_pkey ON public.funds USING btree (id);

CREATE UNIQUE INDEX influencer_categories_pkey ON public.influencer_categories USING btree (influencer_id, category_id);

CREATE UNIQUE INDEX influencer_tags_pkey ON public.influencer_tags USING btree (influencer_id, tag_id);

CREATE UNIQUE INDEX influencers_pkey ON public.influencers USING btree (id);

CREATE INDEX influencers_platform_is_active_idx ON public.influencers USING btree (platform, is_active);

CREATE UNIQUE INDEX reddit_channel_categories_pkey ON public.reddit_channel_categories USING btree (reddit_channel_id, category_id);

CREATE UNIQUE INDEX reddit_channel_tags_pkey ON public.reddit_channel_tags USING btree (reddit_channel_id, tag_id);

CREATE UNIQUE INDEX reddit_channels_pkey ON public.reddit_channels USING btree (id);

CREATE UNIQUE INDEX reddit_channels_url_key ON public.reddit_channels USING btree (url);

CREATE UNIQUE INDEX website_categories_pkey ON public.website_categories USING btree (website_id, category_id);

alter table "public"."beta_config" add constraint "beta_config_pkey" PRIMARY KEY using index "beta_config_pkey";

alter table "public"."fund_categories" add constraint "fund_categories_pkey" PRIMARY KEY using index "fund_categories_pkey";

alter table "public"."fund_tags" add constraint "fund_tags_pkey" PRIMARY KEY using index "fund_tags_pkey";

alter table "public"."funds" add constraint "funds_pkey" PRIMARY KEY using index "funds_pkey";

alter table "public"."influencer_categories" add constraint "influencer_categories_pkey" PRIMARY KEY using index "influencer_categories_pkey";

alter table "public"."influencer_tags" add constraint "influencer_tags_pkey" PRIMARY KEY using index "influencer_tags_pkey";

alter table "public"."influencers" add constraint "influencers_pkey" PRIMARY KEY using index "influencers_pkey";

alter table "public"."reddit_channel_categories" add constraint "reddit_channel_categories_pkey" PRIMARY KEY using index "reddit_channel_categories_pkey";

alter table "public"."reddit_channel_tags" add constraint "reddit_channel_tags_pkey" PRIMARY KEY using index "reddit_channel_tags_pkey";

alter table "public"."reddit_channels" add constraint "reddit_channels_pkey" PRIMARY KEY using index "reddit_channels_pkey";

alter table "public"."website_categories" add constraint "website_categories_pkey" PRIMARY KEY using index "website_categories_pkey";

alter table "public"."beta_config" add constraint "beta_config_updated_by_id_fkey" FOREIGN KEY (updated_by_id) REFERENCES public.admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."beta_config" validate constraint "beta_config_updated_by_id_fkey";

alter table "public"."curation_results" add constraint "curation_results_fund_id_fkey" FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."curation_results" validate constraint "curation_results_fund_id_fkey";

alter table "public"."curation_results" add constraint "curation_results_influencer_id_fkey" FOREIGN KEY (influencer_id) REFERENCES public.influencers(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."curation_results" validate constraint "curation_results_influencer_id_fkey";

alter table "public"."curation_results" add constraint "curation_results_reddit_channel_id_fkey" FOREIGN KEY (reddit_channel_id) REFERENCES public.reddit_channels(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."curation_results" validate constraint "curation_results_reddit_channel_id_fkey";

alter table "public"."fund_categories" add constraint "fund_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."fund_categories" validate constraint "fund_categories_category_id_fkey";

alter table "public"."fund_categories" add constraint "fund_categories_fund_id_fkey" FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."fund_categories" validate constraint "fund_categories_fund_id_fkey";

alter table "public"."fund_tags" add constraint "fund_tags_fund_id_fkey" FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."fund_tags" validate constraint "fund_tags_fund_id_fkey";

alter table "public"."fund_tags" add constraint "fund_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."fund_tags" validate constraint "fund_tags_tag_id_fkey";

alter table "public"."funds" add constraint "funds_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."funds" validate constraint "funds_country_id_fkey";

alter table "public"."influencer_categories" add constraint "influencer_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."influencer_categories" validate constraint "influencer_categories_category_id_fkey";

alter table "public"."influencer_categories" add constraint "influencer_categories_influencer_id_fkey" FOREIGN KEY (influencer_id) REFERENCES public.influencers(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."influencer_categories" validate constraint "influencer_categories_influencer_id_fkey";

alter table "public"."influencer_tags" add constraint "influencer_tags_influencer_id_fkey" FOREIGN KEY (influencer_id) REFERENCES public.influencers(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."influencer_tags" validate constraint "influencer_tags_influencer_id_fkey";

alter table "public"."influencer_tags" add constraint "influencer_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."influencer_tags" validate constraint "influencer_tags_tag_id_fkey";

alter table "public"."influencers" add constraint "influencers_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."influencers" validate constraint "influencers_country_id_fkey";

alter table "public"."reddit_channel_categories" add constraint "reddit_channel_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."reddit_channel_categories" validate constraint "reddit_channel_categories_category_id_fkey";

alter table "public"."reddit_channel_categories" add constraint "reddit_channel_categories_reddit_channel_id_fkey" FOREIGN KEY (reddit_channel_id) REFERENCES public.reddit_channels(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."reddit_channel_categories" validate constraint "reddit_channel_categories_reddit_channel_id_fkey";

alter table "public"."reddit_channel_tags" add constraint "reddit_channel_tags_reddit_channel_id_fkey" FOREIGN KEY (reddit_channel_id) REFERENCES public.reddit_channels(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."reddit_channel_tags" validate constraint "reddit_channel_tags_reddit_channel_id_fkey";

alter table "public"."reddit_channel_tags" add constraint "reddit_channel_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."reddit_channel_tags" validate constraint "reddit_channel_tags_tag_id_fkey";

alter table "public"."website_categories" add constraint "website_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."website_categories" validate constraint "website_categories_category_id_fkey";

alter table "public"."website_categories" add constraint "website_categories_website_id_fkey" FOREIGN KEY (website_id) REFERENCES public.websites(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."website_categories" validate constraint "website_categories_website_id_fkey";

alter table "public"."curation_results" add constraint "curation_results_website_id_fkey" FOREIGN KEY (website_id) REFERENCES public.websites(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."curation_results" validate constraint "curation_results_website_id_fkey";

grant delete on table "public"."beta_config" to "anon";

grant insert on table "public"."beta_config" to "anon";

grant references on table "public"."beta_config" to "anon";

grant select on table "public"."beta_config" to "anon";

grant trigger on table "public"."beta_config" to "anon";

grant truncate on table "public"."beta_config" to "anon";

grant update on table "public"."beta_config" to "anon";

grant delete on table "public"."beta_config" to "authenticated";

grant insert on table "public"."beta_config" to "authenticated";

grant references on table "public"."beta_config" to "authenticated";

grant select on table "public"."beta_config" to "authenticated";

grant trigger on table "public"."beta_config" to "authenticated";

grant truncate on table "public"."beta_config" to "authenticated";

grant update on table "public"."beta_config" to "authenticated";

grant delete on table "public"."beta_config" to "service_role";

grant insert on table "public"."beta_config" to "service_role";

grant references on table "public"."beta_config" to "service_role";

grant select on table "public"."beta_config" to "service_role";

grant trigger on table "public"."beta_config" to "service_role";

grant truncate on table "public"."beta_config" to "service_role";

grant update on table "public"."beta_config" to "service_role";

grant delete on table "public"."fund_categories" to "anon";

grant insert on table "public"."fund_categories" to "anon";

grant references on table "public"."fund_categories" to "anon";

grant select on table "public"."fund_categories" to "anon";

grant trigger on table "public"."fund_categories" to "anon";

grant truncate on table "public"."fund_categories" to "anon";

grant update on table "public"."fund_categories" to "anon";

grant delete on table "public"."fund_categories" to "authenticated";

grant insert on table "public"."fund_categories" to "authenticated";

grant references on table "public"."fund_categories" to "authenticated";

grant select on table "public"."fund_categories" to "authenticated";

grant trigger on table "public"."fund_categories" to "authenticated";

grant truncate on table "public"."fund_categories" to "authenticated";

grant update on table "public"."fund_categories" to "authenticated";

grant delete on table "public"."fund_categories" to "service_role";

grant insert on table "public"."fund_categories" to "service_role";

grant references on table "public"."fund_categories" to "service_role";

grant select on table "public"."fund_categories" to "service_role";

grant trigger on table "public"."fund_categories" to "service_role";

grant truncate on table "public"."fund_categories" to "service_role";

grant update on table "public"."fund_categories" to "service_role";

grant delete on table "public"."fund_tags" to "anon";

grant insert on table "public"."fund_tags" to "anon";

grant references on table "public"."fund_tags" to "anon";

grant select on table "public"."fund_tags" to "anon";

grant trigger on table "public"."fund_tags" to "anon";

grant truncate on table "public"."fund_tags" to "anon";

grant update on table "public"."fund_tags" to "anon";

grant delete on table "public"."fund_tags" to "authenticated";

grant insert on table "public"."fund_tags" to "authenticated";

grant references on table "public"."fund_tags" to "authenticated";

grant select on table "public"."fund_tags" to "authenticated";

grant trigger on table "public"."fund_tags" to "authenticated";

grant truncate on table "public"."fund_tags" to "authenticated";

grant update on table "public"."fund_tags" to "authenticated";

grant delete on table "public"."fund_tags" to "service_role";

grant insert on table "public"."fund_tags" to "service_role";

grant references on table "public"."fund_tags" to "service_role";

grant select on table "public"."fund_tags" to "service_role";

grant trigger on table "public"."fund_tags" to "service_role";

grant truncate on table "public"."fund_tags" to "service_role";

grant update on table "public"."fund_tags" to "service_role";

grant delete on table "public"."funds" to "anon";

grant insert on table "public"."funds" to "anon";

grant references on table "public"."funds" to "anon";

grant select on table "public"."funds" to "anon";

grant trigger on table "public"."funds" to "anon";

grant truncate on table "public"."funds" to "anon";

grant update on table "public"."funds" to "anon";

grant delete on table "public"."funds" to "authenticated";

grant insert on table "public"."funds" to "authenticated";

grant references on table "public"."funds" to "authenticated";

grant select on table "public"."funds" to "authenticated";

grant trigger on table "public"."funds" to "authenticated";

grant truncate on table "public"."funds" to "authenticated";

grant update on table "public"."funds" to "authenticated";

grant delete on table "public"."funds" to "service_role";

grant insert on table "public"."funds" to "service_role";

grant references on table "public"."funds" to "service_role";

grant select on table "public"."funds" to "service_role";

grant trigger on table "public"."funds" to "service_role";

grant truncate on table "public"."funds" to "service_role";

grant update on table "public"."funds" to "service_role";

grant delete on table "public"."influencer_categories" to "anon";

grant insert on table "public"."influencer_categories" to "anon";

grant references on table "public"."influencer_categories" to "anon";

grant select on table "public"."influencer_categories" to "anon";

grant trigger on table "public"."influencer_categories" to "anon";

grant truncate on table "public"."influencer_categories" to "anon";

grant update on table "public"."influencer_categories" to "anon";

grant delete on table "public"."influencer_categories" to "authenticated";

grant insert on table "public"."influencer_categories" to "authenticated";

grant references on table "public"."influencer_categories" to "authenticated";

grant select on table "public"."influencer_categories" to "authenticated";

grant trigger on table "public"."influencer_categories" to "authenticated";

grant truncate on table "public"."influencer_categories" to "authenticated";

grant update on table "public"."influencer_categories" to "authenticated";

grant delete on table "public"."influencer_categories" to "service_role";

grant insert on table "public"."influencer_categories" to "service_role";

grant references on table "public"."influencer_categories" to "service_role";

grant select on table "public"."influencer_categories" to "service_role";

grant trigger on table "public"."influencer_categories" to "service_role";

grant truncate on table "public"."influencer_categories" to "service_role";

grant update on table "public"."influencer_categories" to "service_role";

grant delete on table "public"."influencer_tags" to "anon";

grant insert on table "public"."influencer_tags" to "anon";

grant references on table "public"."influencer_tags" to "anon";

grant select on table "public"."influencer_tags" to "anon";

grant trigger on table "public"."influencer_tags" to "anon";

grant truncate on table "public"."influencer_tags" to "anon";

grant update on table "public"."influencer_tags" to "anon";

grant delete on table "public"."influencer_tags" to "authenticated";

grant insert on table "public"."influencer_tags" to "authenticated";

grant references on table "public"."influencer_tags" to "authenticated";

grant select on table "public"."influencer_tags" to "authenticated";

grant trigger on table "public"."influencer_tags" to "authenticated";

grant truncate on table "public"."influencer_tags" to "authenticated";

grant update on table "public"."influencer_tags" to "authenticated";

grant delete on table "public"."influencer_tags" to "service_role";

grant insert on table "public"."influencer_tags" to "service_role";

grant references on table "public"."influencer_tags" to "service_role";

grant select on table "public"."influencer_tags" to "service_role";

grant trigger on table "public"."influencer_tags" to "service_role";

grant truncate on table "public"."influencer_tags" to "service_role";

grant update on table "public"."influencer_tags" to "service_role";

grant delete on table "public"."influencers" to "anon";

grant insert on table "public"."influencers" to "anon";

grant references on table "public"."influencers" to "anon";

grant select on table "public"."influencers" to "anon";

grant trigger on table "public"."influencers" to "anon";

grant truncate on table "public"."influencers" to "anon";

grant update on table "public"."influencers" to "anon";

grant delete on table "public"."influencers" to "authenticated";

grant insert on table "public"."influencers" to "authenticated";

grant references on table "public"."influencers" to "authenticated";

grant select on table "public"."influencers" to "authenticated";

grant trigger on table "public"."influencers" to "authenticated";

grant truncate on table "public"."influencers" to "authenticated";

grant update on table "public"."influencers" to "authenticated";

grant delete on table "public"."influencers" to "service_role";

grant insert on table "public"."influencers" to "service_role";

grant references on table "public"."influencers" to "service_role";

grant select on table "public"."influencers" to "service_role";

grant trigger on table "public"."influencers" to "service_role";

grant truncate on table "public"."influencers" to "service_role";

grant update on table "public"."influencers" to "service_role";

grant delete on table "public"."reddit_channel_categories" to "anon";

grant insert on table "public"."reddit_channel_categories" to "anon";

grant references on table "public"."reddit_channel_categories" to "anon";

grant select on table "public"."reddit_channel_categories" to "anon";

grant trigger on table "public"."reddit_channel_categories" to "anon";

grant truncate on table "public"."reddit_channel_categories" to "anon";

grant update on table "public"."reddit_channel_categories" to "anon";

grant delete on table "public"."reddit_channel_categories" to "authenticated";

grant insert on table "public"."reddit_channel_categories" to "authenticated";

grant references on table "public"."reddit_channel_categories" to "authenticated";

grant select on table "public"."reddit_channel_categories" to "authenticated";

grant trigger on table "public"."reddit_channel_categories" to "authenticated";

grant truncate on table "public"."reddit_channel_categories" to "authenticated";

grant update on table "public"."reddit_channel_categories" to "authenticated";

grant delete on table "public"."reddit_channel_categories" to "service_role";

grant insert on table "public"."reddit_channel_categories" to "service_role";

grant references on table "public"."reddit_channel_categories" to "service_role";

grant select on table "public"."reddit_channel_categories" to "service_role";

grant trigger on table "public"."reddit_channel_categories" to "service_role";

grant truncate on table "public"."reddit_channel_categories" to "service_role";

grant update on table "public"."reddit_channel_categories" to "service_role";

grant delete on table "public"."reddit_channel_tags" to "anon";

grant insert on table "public"."reddit_channel_tags" to "anon";

grant references on table "public"."reddit_channel_tags" to "anon";

grant select on table "public"."reddit_channel_tags" to "anon";

grant trigger on table "public"."reddit_channel_tags" to "anon";

grant truncate on table "public"."reddit_channel_tags" to "anon";

grant update on table "public"."reddit_channel_tags" to "anon";

grant delete on table "public"."reddit_channel_tags" to "authenticated";

grant insert on table "public"."reddit_channel_tags" to "authenticated";

grant references on table "public"."reddit_channel_tags" to "authenticated";

grant select on table "public"."reddit_channel_tags" to "authenticated";

grant trigger on table "public"."reddit_channel_tags" to "authenticated";

grant truncate on table "public"."reddit_channel_tags" to "authenticated";

grant update on table "public"."reddit_channel_tags" to "authenticated";

grant delete on table "public"."reddit_channel_tags" to "service_role";

grant insert on table "public"."reddit_channel_tags" to "service_role";

grant references on table "public"."reddit_channel_tags" to "service_role";

grant select on table "public"."reddit_channel_tags" to "service_role";

grant trigger on table "public"."reddit_channel_tags" to "service_role";

grant truncate on table "public"."reddit_channel_tags" to "service_role";

grant update on table "public"."reddit_channel_tags" to "service_role";

grant delete on table "public"."reddit_channels" to "anon";

grant insert on table "public"."reddit_channels" to "anon";

grant references on table "public"."reddit_channels" to "anon";

grant select on table "public"."reddit_channels" to "anon";

grant trigger on table "public"."reddit_channels" to "anon";

grant truncate on table "public"."reddit_channels" to "anon";

grant update on table "public"."reddit_channels" to "anon";

grant delete on table "public"."reddit_channels" to "authenticated";

grant insert on table "public"."reddit_channels" to "authenticated";

grant references on table "public"."reddit_channels" to "authenticated";

grant select on table "public"."reddit_channels" to "authenticated";

grant trigger on table "public"."reddit_channels" to "authenticated";

grant truncate on table "public"."reddit_channels" to "authenticated";

grant update on table "public"."reddit_channels" to "authenticated";

grant delete on table "public"."reddit_channels" to "service_role";

grant insert on table "public"."reddit_channels" to "service_role";

grant references on table "public"."reddit_channels" to "service_role";

grant select on table "public"."reddit_channels" to "service_role";

grant trigger on table "public"."reddit_channels" to "service_role";

grant truncate on table "public"."reddit_channels" to "service_role";

grant update on table "public"."reddit_channels" to "service_role";

grant delete on table "public"."website_categories" to "anon";

grant insert on table "public"."website_categories" to "anon";

grant references on table "public"."website_categories" to "anon";

grant select on table "public"."website_categories" to "anon";

grant trigger on table "public"."website_categories" to "anon";

grant truncate on table "public"."website_categories" to "anon";

grant update on table "public"."website_categories" to "anon";

grant delete on table "public"."website_categories" to "authenticated";

grant insert on table "public"."website_categories" to "authenticated";

grant references on table "public"."website_categories" to "authenticated";

grant select on table "public"."website_categories" to "authenticated";

grant trigger on table "public"."website_categories" to "authenticated";

grant truncate on table "public"."website_categories" to "authenticated";

grant update on table "public"."website_categories" to "authenticated";

grant delete on table "public"."website_categories" to "service_role";

grant insert on table "public"."website_categories" to "service_role";

grant references on table "public"."website_categories" to "service_role";

grant select on table "public"."website_categories" to "service_role";

grant trigger on table "public"."website_categories" to "service_role";

grant truncate on table "public"."website_categories" to "service_role";

grant update on table "public"."website_categories" to "service_role";


