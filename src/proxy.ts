import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Edge-compatible auth — no DB, no Node.js crypto
const { auth } = NextAuth(authConfig);

export default auth(function proxy(request: NextRequest & { auth?: { user?: { id?: string } } }) {
  const { pathname } = request.nextUrl;

  // Dashboard: requires user session
  if (pathname.startsWith("/dashboard")) {
    if (!request.auth?.user?.id) {
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
    const adminSession = request.cookies.get("admin_session");
    if (!adminSession?.value) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    // Note: Full session token verification happens server-side in admin components
    // This edge check just ensures the cookie exists
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
