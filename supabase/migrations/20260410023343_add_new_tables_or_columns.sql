


  create table "public"."affiliate_commissions" (
    "id" text not null,
    "affiliate_user_id" text not null,
    "referred_user_id" text not null,
    "payment_id" text,
    "referral_code" text not null,
    "payment_type" public."PaymentType" not null,
    "commission_pct" integer not null,
    "amount_cents" integer not null,
    "status" text not null default 'pending'::text,
    "earned_at" timestamp with time zone not null,
    "eligible_at" timestamp with time zone not null,
    "paid_at" timestamp with time zone,
    "payout_method" text,
    "payout_reference" text,
    "admin_note" text,
    "marked_by_admin_id" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "payout_batch_id" text
      );



  create table "public"."affiliate_payout_batches" (
    "id" text not null,
    "affiliate_user_id" text not null,
    "total_amount_cents" integer not null,
    "commission_count" integer not null,
    "payout_method" text not null,
    "payout_reference" text,
    "admin_note" text,
    "paid_at" timestamp with time zone not null,
    "created_by_admin_id" text,
    "status" text not null default 'paid'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."affiliate_profiles" (
    "user_id" text not null,
    "referral_code" text not null,
    "paypal_email" text,
    "starter_commission_pct" integer not null default 25,
    "hire_us_commission_pct" integer not null default 15,
    "enrolled_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "is_active" boolean not null default false,
    "is_disabled_by_admin" boolean not null default false,
    "marketing_channel" text,
    "terms_accepted_at" timestamp with time zone
      );



  create table "public"."affiliate_referrals" (
    "id" text not null,
    "referrer_user_id" text not null,
    "referred_user_id" text not null,
    "referral_code" text not null,
    "created_at" timestamp with time zone not null default now()
      );


CREATE INDEX affiliate_commissions_affiliate_user_id_status_idx ON public.affiliate_commissions USING btree (affiliate_user_id, status);

CREATE INDEX affiliate_commissions_paid_at_idx ON public.affiliate_commissions USING btree (paid_at);

CREATE UNIQUE INDEX affiliate_commissions_payment_id_key ON public.affiliate_commissions USING btree (payment_id);

CREATE INDEX affiliate_commissions_payout_batch_id_idx ON public.affiliate_commissions USING btree (payout_batch_id);

CREATE UNIQUE INDEX affiliate_commissions_pkey ON public.affiliate_commissions USING btree (id);

CREATE INDEX affiliate_commissions_status_eligible_at_idx ON public.affiliate_commissions USING btree (status, eligible_at);

CREATE INDEX affiliate_payout_batches_affiliate_user_id_paid_at_idx ON public.affiliate_payout_batches USING btree (affiliate_user_id, paid_at);

CREATE UNIQUE INDEX affiliate_payout_batches_pkey ON public.affiliate_payout_batches USING btree (id);

CREATE INDEX affiliate_payout_batches_status_paid_at_idx ON public.affiliate_payout_batches USING btree (status, paid_at);

CREATE INDEX affiliate_profiles_is_active_idx ON public.affiliate_profiles USING btree (is_active, is_disabled_by_admin);

CREATE UNIQUE INDEX affiliate_profiles_pkey ON public.affiliate_profiles USING btree (user_id);

CREATE UNIQUE INDEX affiliate_profiles_referral_code_key ON public.affiliate_profiles USING btree (referral_code);

CREATE UNIQUE INDEX affiliate_referrals_pkey ON public.affiliate_referrals USING btree (id);

CREATE INDEX affiliate_referrals_referral_code_idx ON public.affiliate_referrals USING btree (referral_code);

CREATE UNIQUE INDEX affiliate_referrals_referred_user_id_key ON public.affiliate_referrals USING btree (referred_user_id);

CREATE INDEX affiliate_referrals_referrer_user_id_idx ON public.affiliate_referrals USING btree (referrer_user_id);

alter table "public"."affiliate_commissions" add constraint "affiliate_commissions_pkey" PRIMARY KEY using index "affiliate_commissions_pkey";

alter table "public"."affiliate_payout_batches" add constraint "affiliate_payout_batches_pkey" PRIMARY KEY using index "affiliate_payout_batches_pkey";

alter table "public"."affiliate_profiles" add constraint "affiliate_profiles_pkey" PRIMARY KEY using index "affiliate_profiles_pkey";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_pkey" PRIMARY KEY using index "affiliate_referrals_pkey";

alter table "public"."affiliate_commissions" add constraint "affiliate_commissions_affiliate_user_id_fkey" FOREIGN KEY (affiliate_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_commissions" validate constraint "affiliate_commissions_affiliate_user_id_fkey";

alter table "public"."affiliate_commissions" add constraint "affiliate_commissions_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL not valid;

alter table "public"."affiliate_commissions" validate constraint "affiliate_commissions_payment_id_fkey";

alter table "public"."affiliate_commissions" add constraint "affiliate_commissions_payment_id_key" UNIQUE using index "affiliate_commissions_payment_id_key";

alter table "public"."affiliate_commissions" add constraint "affiliate_commissions_payout_batch_id_fkey" FOREIGN KEY (payout_batch_id) REFERENCES public.affiliate_payout_batches(id) ON DELETE SET NULL not valid;

alter table "public"."affiliate_commissions" validate constraint "affiliate_commissions_payout_batch_id_fkey";

alter table "public"."affiliate_commissions" add constraint "affiliate_commissions_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_commissions" validate constraint "affiliate_commissions_referred_user_id_fkey";

alter table "public"."affiliate_commissions" add constraint "affiliate_commissions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'eligible'::text, 'paid'::text, 'reversed'::text]))) not valid;

alter table "public"."affiliate_commissions" validate constraint "affiliate_commissions_status_check";

alter table "public"."affiliate_payout_batches" add constraint "affiliate_payout_batches_affiliate_user_id_fkey" FOREIGN KEY (affiliate_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_payout_batches" validate constraint "affiliate_payout_batches_affiliate_user_id_fkey";

alter table "public"."affiliate_payout_batches" add constraint "affiliate_payout_batches_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'paid'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."affiliate_payout_batches" validate constraint "affiliate_payout_batches_status_check";

alter table "public"."affiliate_profiles" add constraint "affiliate_profiles_hire_us_commission_pct_check" CHECK (((hire_us_commission_pct >= 0) AND (hire_us_commission_pct <= 100))) not valid;

alter table "public"."affiliate_profiles" validate constraint "affiliate_profiles_hire_us_commission_pct_check";

alter table "public"."affiliate_profiles" add constraint "affiliate_profiles_referral_code_key" UNIQUE using index "affiliate_profiles_referral_code_key";

alter table "public"."affiliate_profiles" add constraint "affiliate_profiles_starter_commission_pct_check" CHECK (((starter_commission_pct >= 0) AND (starter_commission_pct <= 100))) not valid;

alter table "public"."affiliate_profiles" validate constraint "affiliate_profiles_starter_commission_pct_check";

alter table "public"."affiliate_profiles" add constraint "affiliate_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_profiles" validate constraint "affiliate_profiles_user_id_fkey";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_referrals" validate constraint "affiliate_referrals_referred_user_id_fkey";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_referred_user_id_key" UNIQUE using index "affiliate_referrals_referred_user_id_key";

alter table "public"."affiliate_referrals" add constraint "affiliate_referrals_referrer_user_id_fkey" FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."affiliate_referrals" validate constraint "affiliate_referrals_referrer_user_id_fkey";

grant delete on table "public"."affiliate_commissions" to "anon";

grant insert on table "public"."affiliate_commissions" to "anon";

grant references on table "public"."affiliate_commissions" to "anon";

grant select on table "public"."affiliate_commissions" to "anon";

grant trigger on table "public"."affiliate_commissions" to "anon";

grant truncate on table "public"."affiliate_commissions" to "anon";

grant update on table "public"."affiliate_commissions" to "anon";

grant delete on table "public"."affiliate_commissions" to "authenticated";

grant insert on table "public"."affiliate_commissions" to "authenticated";

grant references on table "public"."affiliate_commissions" to "authenticated";

grant select on table "public"."affiliate_commissions" to "authenticated";

grant trigger on table "public"."affiliate_commissions" to "authenticated";

grant truncate on table "public"."affiliate_commissions" to "authenticated";

grant update on table "public"."affiliate_commissions" to "authenticated";

grant delete on table "public"."affiliate_commissions" to "service_role";

grant insert on table "public"."affiliate_commissions" to "service_role";

grant references on table "public"."affiliate_commissions" to "service_role";

grant select on table "public"."affiliate_commissions" to "service_role";

grant trigger on table "public"."affiliate_commissions" to "service_role";

grant truncate on table "public"."affiliate_commissions" to "service_role";

grant update on table "public"."affiliate_commissions" to "service_role";

grant delete on table "public"."affiliate_payout_batches" to "anon";

grant insert on table "public"."affiliate_payout_batches" to "anon";

grant references on table "public"."affiliate_payout_batches" to "anon";

grant select on table "public"."affiliate_payout_batches" to "anon";

grant trigger on table "public"."affiliate_payout_batches" to "anon";

grant truncate on table "public"."affiliate_payout_batches" to "anon";

grant update on table "public"."affiliate_payout_batches" to "anon";

grant delete on table "public"."affiliate_payout_batches" to "authenticated";

grant insert on table "public"."affiliate_payout_batches" to "authenticated";

grant references on table "public"."affiliate_payout_batches" to "authenticated";

grant select on table "public"."affiliate_payout_batches" to "authenticated";

grant trigger on table "public"."affiliate_payout_batches" to "authenticated";

grant truncate on table "public"."affiliate_payout_batches" to "authenticated";

grant update on table "public"."affiliate_payout_batches" to "authenticated";

grant delete on table "public"."affiliate_payout_batches" to "service_role";

grant insert on table "public"."affiliate_payout_batches" to "service_role";

grant references on table "public"."affiliate_payout_batches" to "service_role";

grant select on table "public"."affiliate_payout_batches" to "service_role";

grant trigger on table "public"."affiliate_payout_batches" to "service_role";

grant truncate on table "public"."affiliate_payout_batches" to "service_role";

grant update on table "public"."affiliate_payout_batches" to "service_role";

grant delete on table "public"."affiliate_profiles" to "anon";

grant insert on table "public"."affiliate_profiles" to "anon";

grant references on table "public"."affiliate_profiles" to "anon";

grant select on table "public"."affiliate_profiles" to "anon";

grant trigger on table "public"."affiliate_profiles" to "anon";

grant truncate on table "public"."affiliate_profiles" to "anon";

grant update on table "public"."affiliate_profiles" to "anon";

grant delete on table "public"."affiliate_profiles" to "authenticated";

grant insert on table "public"."affiliate_profiles" to "authenticated";

grant references on table "public"."affiliate_profiles" to "authenticated";

grant select on table "public"."affiliate_profiles" to "authenticated";

grant trigger on table "public"."affiliate_profiles" to "authenticated";

grant truncate on table "public"."affiliate_profiles" to "authenticated";

grant update on table "public"."affiliate_profiles" to "authenticated";

grant delete on table "public"."affiliate_profiles" to "service_role";

grant insert on table "public"."affiliate_profiles" to "service_role";

grant references on table "public"."affiliate_profiles" to "service_role";

grant select on table "public"."affiliate_profiles" to "service_role";

grant trigger on table "public"."affiliate_profiles" to "service_role";

grant truncate on table "public"."affiliate_profiles" to "service_role";

grant update on table "public"."affiliate_profiles" to "service_role";

grant delete on table "public"."affiliate_referrals" to "anon";

grant insert on table "public"."affiliate_referrals" to "anon";

grant references on table "public"."affiliate_referrals" to "anon";

grant select on table "public"."affiliate_referrals" to "anon";

grant trigger on table "public"."affiliate_referrals" to "anon";

grant truncate on table "public"."affiliate_referrals" to "anon";

grant update on table "public"."affiliate_referrals" to "anon";

grant delete on table "public"."affiliate_referrals" to "authenticated";

grant insert on table "public"."affiliate_referrals" to "authenticated";

grant references on table "public"."affiliate_referrals" to "authenticated";

grant select on table "public"."affiliate_referrals" to "authenticated";

grant trigger on table "public"."affiliate_referrals" to "authenticated";

grant truncate on table "public"."affiliate_referrals" to "authenticated";

grant update on table "public"."affiliate_referrals" to "authenticated";

grant delete on table "public"."affiliate_referrals" to "service_role";

grant insert on table "public"."affiliate_referrals" to "service_role";

grant references on table "public"."affiliate_referrals" to "service_role";

grant select on table "public"."affiliate_referrals" to "service_role";

grant trigger on table "public"."affiliate_referrals" to "service_role";

grant truncate on table "public"."affiliate_referrals" to "service_role";

grant update on table "public"."affiliate_referrals" to "service_role";


