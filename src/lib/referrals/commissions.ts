import { randomUUID } from "crypto";
import { db } from "@/lib/db";

type CommissionCandidateRow = {
  affiliateUserId: string;
  referredUserId: string;
  paymentId: string;
  referralCode: string;
  paymentType: "plan" | "hire_us";
  commissionPct: number;
  amountCents: number;
  earnedAt: Date;
  eligibleAt: Date;
};

export async function createAffiliateCommissionForPayment(paymentId: string): Promise<void> {
  const rows = await db.$queryRaw<CommissionCandidateRow[]>`
    SELECT
      ar.referrer_user_id AS "affiliateUserId",
      ar.referred_user_id AS "referredUserId",
      p.id AS "paymentId",
      ar.referral_code AS "referralCode",
      p.payment_type AS "paymentType",
      CASE
        WHEN p.payment_type = 'hire_us' THEN ap.hire_us_commission_pct
        ELSE ap.starter_commission_pct
      END::int AS "commissionPct",
      CASE
        WHEN p.payment_type = 'hire_us' THEN FLOOR((p.amount_cents * ap.hire_us_commission_pct) / 100.0)
        ELSE FLOOR((p.amount_cents * ap.starter_commission_pct) / 100.0)
      END::int AS "amountCents",
      p.created_at AS "earnedAt",
      (p.created_at + INTERVAL '15 days') AS "eligibleAt"
    FROM payments p
    JOIN affiliate_referrals ar ON ar.referred_user_id = p.user_id
    JOIN affiliate_profiles ap ON ap.user_id = ar.referrer_user_id
    LEFT JOIN plan_configs pc ON pc.id = p.plan_id
    WHERE p.id = ${paymentId}
      AND p.status = 'completed'
      AND (
        p.payment_type = 'hire_us'
        OR (p.payment_type = 'plan' AND pc.slug = 'starter')
      )
    LIMIT 1
  `;

  const candidate = rows[0];
  if (!candidate) {
    return;
  }

  const status = candidate.eligibleAt <= new Date() ? "eligible" : "pending";

  await db.$executeRaw`
    INSERT INTO affiliate_commissions (
      id,
      affiliate_user_id,
      referred_user_id,
      payment_id,
      referral_code,
      payment_type,
      commission_pct,
      amount_cents,
      status,
      earned_at,
      eligible_at,
      created_at,
      updated_at
    )
    VALUES (
      ${randomUUID()},
      ${candidate.affiliateUserId},
      ${candidate.referredUserId},
      ${candidate.paymentId},
      ${candidate.referralCode},
      ${candidate.paymentType},
      ${candidate.commissionPct},
      ${candidate.amountCents},
      ${status},
      ${candidate.earnedAt},
      ${candidate.eligibleAt},
      NOW(),
      NOW()
    )
    ON CONFLICT (payment_id) DO NOTHING
  `;
}
