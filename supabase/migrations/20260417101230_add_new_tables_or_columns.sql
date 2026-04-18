drop function if exists "public"."rls_auto_enable"();


  create table "public"."content_creator_profiles" (
    "user_id" text not null,
    "is_enabled" boolean not null default false,
    "max_invites" integer not null default 0,
    "used_invites" integer not null default 0,
    "invite_token" text not null,
    "expires_at" timestamp with time zone,
    "disabled_at" timestamp with time zone,
    "disabled_reason" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."content_creator_referrals" (
    "id" text not null,
    "creator_user_id" text not null,
    "referred_user_id" text not null,
    "invite_token" text not null,
    "accepted_at" timestamp with time zone not null default now()
      );


alter table "public"."beta_config" add column "site_notice" jsonb not null default '{}'::jsonb;

alter table "public"."users" add column "referred_by_creator_id" text;

CREATE INDEX content_creator_profiles_enabled_usage_idx ON public.content_creator_profiles USING btree (is_enabled, used_invites, max_invites);

CREATE UNIQUE INDEX content_creator_profiles_invite_token_key ON public.content_creator_profiles USING btree (invite_token);

CREATE INDEX content_creator_profiles_is_enabled_idx ON public.content_creator_profiles USING btree (is_enabled);

CREATE UNIQUE INDEX content_creator_profiles_pkey ON public.content_creator_profiles USING btree (user_id);

CREATE INDEX content_creator_referrals_creator_user_id_accepted_at_idx ON public.content_creator_referrals USING btree (creator_user_id, accepted_at DESC);

CREATE UNIQUE INDEX content_creator_referrals_creator_user_id_referred_user_id_key ON public.content_creator_referrals USING btree (creator_user_id, referred_user_id);

CREATE INDEX content_creator_referrals_invite_token_idx ON public.content_creator_referrals USING btree (invite_token);

CREATE UNIQUE INDEX content_creator_referrals_pkey ON public.content_creator_referrals USING btree (id);

CREATE UNIQUE INDEX content_creator_referrals_referred_user_id_key ON public.content_creator_referrals USING btree (referred_user_id);

CREATE INDEX users_referred_by_creator_id_idx ON public.users USING btree (referred_by_creator_id);

alter table "public"."content_creator_profiles" add constraint "content_creator_profiles_pkey" PRIMARY KEY using index "content_creator_profiles_pkey";

alter table "public"."content_creator_referrals" add constraint "content_creator_referrals_pkey" PRIMARY KEY using index "content_creator_referrals_pkey";

alter table "public"."content_creator_profiles" add constraint "content_creator_profiles_invite_token_key" UNIQUE using index "content_creator_profiles_invite_token_key";

alter table "public"."content_creator_profiles" add constraint "content_creator_profiles_max_invites_check" CHECK ((max_invites >= 0)) not valid;

alter table "public"."content_creator_profiles" validate constraint "content_creator_profiles_max_invites_check";

alter table "public"."content_creator_profiles" add constraint "content_creator_profiles_used_invites_check" CHECK ((used_invites >= 0)) not valid;

alter table "public"."content_creator_profiles" validate constraint "content_creator_profiles_used_invites_check";

alter table "public"."content_creator_profiles" add constraint "content_creator_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."content_creator_profiles" validate constraint "content_creator_profiles_user_id_fkey";

alter table "public"."content_creator_referrals" add constraint "content_creator_referrals_creator_user_id_fkey" FOREIGN KEY (creator_user_id) REFERENCES public.content_creator_profiles(user_id) ON DELETE CASCADE not valid;

alter table "public"."content_creator_referrals" validate constraint "content_creator_referrals_creator_user_id_fkey";

alter table "public"."content_creator_referrals" add constraint "content_creator_referrals_creator_user_id_referred_user_id_key" UNIQUE using index "content_creator_referrals_creator_user_id_referred_user_id_key";

alter table "public"."content_creator_referrals" add constraint "content_creator_referrals_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."content_creator_referrals" validate constraint "content_creator_referrals_referred_user_id_fkey";

alter table "public"."content_creator_referrals" add constraint "content_creator_referrals_referred_user_id_key" UNIQUE using index "content_creator_referrals_referred_user_id_key";

alter table "public"."users" add constraint "users_referred_by_creator_id_fkey" FOREIGN KEY (referred_by_creator_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_referred_by_creator_id_fkey";

grant delete on table "public"."content_creator_profiles" to "anon";

grant insert on table "public"."content_creator_profiles" to "anon";

grant references on table "public"."content_creator_profiles" to "anon";

grant select on table "public"."content_creator_profiles" to "anon";

grant trigger on table "public"."content_creator_profiles" to "anon";

grant truncate on table "public"."content_creator_profiles" to "anon";

grant update on table "public"."content_creator_profiles" to "anon";

grant delete on table "public"."content_creator_profiles" to "authenticated";

grant insert on table "public"."content_creator_profiles" to "authenticated";

grant references on table "public"."content_creator_profiles" to "authenticated";

grant select on table "public"."content_creator_profiles" to "authenticated";

grant trigger on table "public"."content_creator_profiles" to "authenticated";

grant truncate on table "public"."content_creator_profiles" to "authenticated";

grant update on table "public"."content_creator_profiles" to "authenticated";

grant delete on table "public"."content_creator_profiles" to "service_role";

grant insert on table "public"."content_creator_profiles" to "service_role";

grant references on table "public"."content_creator_profiles" to "service_role";

grant select on table "public"."content_creator_profiles" to "service_role";

grant trigger on table "public"."content_creator_profiles" to "service_role";

grant truncate on table "public"."content_creator_profiles" to "service_role";

grant update on table "public"."content_creator_profiles" to "service_role";

grant delete on table "public"."content_creator_referrals" to "anon";

grant insert on table "public"."content_creator_referrals" to "anon";

grant references on table "public"."content_creator_referrals" to "anon";

grant select on table "public"."content_creator_referrals" to "anon";

grant trigger on table "public"."content_creator_referrals" to "anon";

grant truncate on table "public"."content_creator_referrals" to "anon";

grant update on table "public"."content_creator_referrals" to "anon";

grant delete on table "public"."content_creator_referrals" to "authenticated";

grant insert on table "public"."content_creator_referrals" to "authenticated";

grant references on table "public"."content_creator_referrals" to "authenticated";

grant select on table "public"."content_creator_referrals" to "authenticated";

grant trigger on table "public"."content_creator_referrals" to "authenticated";

grant truncate on table "public"."content_creator_referrals" to "authenticated";

grant update on table "public"."content_creator_referrals" to "authenticated";

grant delete on table "public"."content_creator_referrals" to "service_role";

grant insert on table "public"."content_creator_referrals" to "service_role";

grant references on table "public"."content_creator_referrals" to "service_role";

grant select on table "public"."content_creator_referrals" to "service_role";

grant trigger on table "public"."content_creator_referrals" to "service_role";

grant truncate on table "public"."content_creator_referrals" to "service_role";

grant update on table "public"."content_creator_referrals" to "service_role";


