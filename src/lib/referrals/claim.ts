import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const REFERRAL_CODE_COOKIE = "pr_referral_code";

type ClaimArgs = {
  referredUserId: string;
  referralCode: string;
  tx?: Prisma.TransactionClient;
};

export async function claimAffiliateReferralForUser(args: ClaimArgs): Promise<boolean> {
  const referralCode = args.referralCode.trim().toUpperCase();
  if (!referralCode || !args.referredUserId) {
    return false;
  }

  const executor = args.tx ?? db;

  const referrerRows = await executor.$queryRaw<Array<{ userId: string }>>`
    SELECT user_id AS "userId"
    FROM affiliate_profiles
    WHERE referral_code = ${referralCode}
      AND is_active = true
      AND is_disabled_by_admin = false
    LIMIT 1
  `;

  const referrerUserId = referrerRows[0]?.userId;
  if (!referrerUserId || referrerUserId === args.referredUserId) {
    return false;
  }

  await executor.$executeRaw`
    INSERT INTO affiliate_referrals (
      id,
      referrer_user_id,
      referred_user_id,
      referral_code
    )
    VALUES (
      ${randomBytes(16).toString("hex")},
      ${referrerUserId},
      ${args.referredUserId},
      ${referralCode}
    )
    ON CONFLICT (referred_user_id) DO NOTHING
  `;

  return true;
}
