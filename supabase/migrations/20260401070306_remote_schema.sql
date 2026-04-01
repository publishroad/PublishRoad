drop extension if exists "pg_net";

alter table "public"."_prisma_migrations" enable row level security;

alter table "public"."admin_users" enable row level security;

alter table "public"."ai_config" enable row level security;

alter table "public"."audit_logs" enable row level security;

alter table "public"."beta_config" enable row level security;

alter table "public"."blog_posts" enable row level security;

alter table "public"."categories" enable row level security;

alter table "public"."contact_submissions" enable row level security;

alter table "public"."countries" enable row level security;

alter table "public"."curation_results" enable row level security;

alter table "public"."curations" enable row level security;

alter table "public"."email_provider_config" enable row level security;

alter table "public"."fund_categories" enable row level security;

alter table "public"."fund_tags" enable row level security;

alter table "public"."funds" enable row level security;

alter table "public"."influencer_categories" enable row level security;

alter table "public"."influencer_tags" enable row level security;

alter table "public"."influencers" enable row level security;

alter table "public"."notifications" enable row level security;

alter table "public"."payment_gateway_config" enable row level security;

alter table "public"."payments" drop column "payment_type";

alter table "public"."payments" drop column "provider_payment_id";

alter table "public"."payments" enable row level security;

alter table "public"."plan_configs" enable row level security;

alter table "public"."processed_stripe_events" enable row level security;

alter table "public"."reddit_channel_categories" enable row level security;

alter table "public"."reddit_channel_tags" enable row level security;

alter table "public"."reddit_channels" enable row level security;

alter table "public"."referrals" enable row level security;

alter table "public"."service_leads" enable row level security;

alter table "public"."sub_categories" enable row level security;

alter table "public"."tags" enable row level security;

alter table "public"."users" enable row level security;

alter table "public"."website_categories" enable row level security;

alter table "public"."website_tags" enable row level security;

alter table "public"."websites" enable row level security;

drop type "public"."PaymentType";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
$function$
;


