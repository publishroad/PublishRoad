import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { REFERRAL_CODE_COOKIE } from "@/lib/referrals/claim";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const referralCode = code.trim().toUpperCase();
  const baseUrl = new URL(request.url).origin;

  if (!referralCode) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  const rows = await db.$queryRaw<Array<{ isActive: boolean; isDisabledByAdmin: boolean }>>`
    SELECT
      is_active AS "isActive",
      is_disabled_by_admin AS "isDisabledByAdmin"
    FROM affiliate_profiles
    WHERE referral_code = ${referralCode}
    LIMIT 1
  `;

  const profile = rows[0];

  if (!profile || !profile.isActive || profile.isDisabledByAdmin) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  const signupUrl = new URL("/signup", baseUrl);
  signupUrl.searchParams.set("ref", referralCode);
  const response = NextResponse.redirect(signupUrl);
  response.cookies.set(REFERRAL_CODE_COOKIE, referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
