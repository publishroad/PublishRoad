import NextAuth from "next-auth";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Edge-compatible auth — no DB, no Node.js crypto
const { auth } = NextAuth(authConfig);
const adminSecretValue = process.env.NEXTAUTH_SECRET;

async function hasValidAdminSession(cookieValue?: string): Promise<boolean> {
  if (!cookieValue || !adminSecretValue) {
    return false;
  }

  try {
    const adminSecret = new TextEncoder().encode(adminSecretValue);
    const { payload } = await jwtVerify(cookieValue, adminSecret);
    return Boolean(payload.adminId) && payload.totpVerified === true;
  } catch {
    return false;
  }
}

export default auth(async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Dashboard: requires user session
  if (pathname.startsWith("/dashboard")) {
    if (!request.auth?.user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin panel: requires admin_session cookie
  // ✅ Validates cookie exists before allowing access
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/setup-2fa") &&
    !pathname.startsWith("/admin/verify-2fa") &&
    !pathname.startsWith("/api/admin/auth")
  ) {
    const adminSession = request.cookies.get("admin_session")?.value;
    if (!(await hasValidAdminSession(adminSession))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
