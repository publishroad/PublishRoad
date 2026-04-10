import { NextRequest, NextResponse } from "next/server";
import { REFERRAL_CODE_COOKIE } from "@/lib/referrals/claim";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const referralCodeRaw = typeof body?.referralCode === "string" ? body.referralCode : "";
  const referralCode = referralCodeRaw.trim().toUpperCase();

  const response = NextResponse.json({ success: true });

  if (!referralCode) {
    return response;
  }

  response.cookies.set(REFERRAL_CODE_COOKIE, referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
