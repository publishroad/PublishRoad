import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  CREATOR_INVITE_COOKIE,
  getCreatorInviteStatus,
  mapInviteStatusToQuery,
  normalizeInviteToken,
} from "@/lib/content-creators/invite";

function clearInviteCookie(response: NextResponse) {
  response.cookies.set(CREATOR_INVITE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const inviteToken = normalizeInviteToken(token);
  const baseUrl = new URL(request.url).origin;

  const signupUrl = new URL("/signup", baseUrl);

  if (!inviteToken) {
    signupUrl.searchParams.set("inviteError", "invite_invalid");
    return NextResponse.redirect(signupUrl);
  }

  const session = await auth();
  if (session?.user?.id) {
    const dashboardUrl = new URL("/dashboard", baseUrl);
    dashboardUrl.searchParams.set("inviteError", "invite_new_signup_only");
    const response = NextResponse.redirect(dashboardUrl);
    clearInviteCookie(response);
    return response;
  }

  const status = await getCreatorInviteStatus(inviteToken);
  if (status.status !== "valid") {
    signupUrl.searchParams.set("inviteError", mapInviteStatusToQuery(status.status));
    const response = NextResponse.redirect(signupUrl);
    clearInviteCookie(response);
    return response;
  }

  signupUrl.searchParams.set("invite", "1");
  const response = NextResponse.redirect(signupUrl);
  response.cookies.set(CREATOR_INVITE_COOKIE, inviteToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
