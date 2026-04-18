


  create table "public"."website_countries" (
    "website_id" text not null,
    "country_id" text not null
      );


alter table "public"."_prisma_migrations" disable row level security;

alter table "public"."admin_users" disable row level security;

alter table "public"."affiliate_commissions" disable row level security;

alter table "public"."affiliate_payout_batches" disable row level security;

alter table "public"."affiliate_profiles" disable row level security;

alter table "public"."affiliate_referrals" disable row level security;

alter table "public"."ai_config" disable row level security;

alter table "public"."audit_logs" disable row level security;

alter table "public"."beta_config" disable row level security;

alter table "public"."blog_posts" disable row level security;

alter table "public"."categories" disable row level security;

alter table "public"."contact_submissions" disable row level security;

alter table "public"."content_creator_profiles" disable row level security;

alter table "public"."content_creator_referrals" disable row level security;

alter table "public"."countries" disable row level security;

alter table "public"."curation_results" disable row level security;

alter table "public"."curations" disable row level security;

alter table "public"."email_provider_config" disable row level security;

alter table "public"."fund_categories" disable row level security;

alter table "public"."fund_tags" disable row level security;

alter table "public"."funds" disable row level security;

alter table "public"."influencer_categories" disable row level security;

alter table "public"."influencer_tags" disable row level security;

alter table "public"."influencers" disable row level security;

alter table "public"."notifications" disable row level security;

alter table "public"."payment_gateway_config" disable row level security;

alter table "public"."payments" disable row level security;

alter table "public"."plan_configs" add column "compare_at_price_cents" integer;

alter table "public"."plan_configs" disable row level security;

alter table "public"."processed_stripe_events" disable row level security;

alter table "public"."reddit_channel_categories" disable row level security;

alter table "public"."reddit_channel_tags" disable row level security;

alter table "public"."reddit_channels" disable row level security;

alter table "public"."referrals" disable row level security;

alter table "public"."service_leads" disable row level security;

alter table "public"."sub_categories" disable row level security;

alter table "public"."tags" disable row level security;

alter table "public"."users" disable row level security;

alter table "public"."website_categories" disable row level security;

alter table "public"."website_tags" disable row level security;

alter table "public"."websites" disable row level security;

CREATE INDEX website_categories_category_id_website_id_idx ON public.website_categories USING btree (category_id, website_id);

CREATE INDEX website_countries_country_id_website_id_idx ON public.website_countries USING btree (country_id, website_id);

CREATE UNIQUE INDEX website_countries_pkey ON public.website_countries USING btree (website_id, country_id);

alter table "public"."website_countries" add constraint "website_countries_pkey" PRIMARY KEY using index "website_countries_pkey";

alter table "public"."website_countries" add constraint "website_countries_country_id_fkey" FOREIGN KEY (country_id) REFERENCES public.countries(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."website_countries" validate constraint "website_countries_country_id_fkey";

alter table "public"."website_countries" add constraint "website_countries_website_id_fkey" FOREIGN KEY (website_id) REFERENCES public.websites(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."website_countries" validate constraint "website_countries_website_id_fkey";

grant delete on table "public"."website_countries" to "anon";

grant insert on table "public"."website_countries" to "anon";

grant references on table "public"."website_countries" to "anon";

grant select on table "public"."website_countries" to "anon";

grant trigger on table "public"."website_countries" to "anon";

grant truncate on table "public"."website_countries" to "anon";

grant update on table "public"."website_countries" to "anon";

grant delete on table "public"."website_countries" to "authenticated";

grant insert on table "public"."website_countries" to "authenticated";

grant references on table "public"."website_countries" to "authenticated";

grant select on table "public"."website_countries" to "authenticated";

grant trigger on table "public"."website_countries" to "authenticated";

grant truncate on table "public"."website_countries" to "authenticated";

grant update on table "public"."website_countries" to "authenticated";

grant delete on table "public"."website_countries" to "service_role";

grant insert on table "public"."website_countries" to "service_role";

grant references on table "public"."website_countries" to "service_role";

grant select on table "public"."website_countries" to "service_role";

grant trigger on table "public"."website_countries" to "service_role";

grant truncate on table "public"."website_countries" to "service_role";

grant update on table "public"."website_countries" to "service_role";


