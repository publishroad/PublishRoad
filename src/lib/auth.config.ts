/**
 * Edge-compatible NextAuth config.
 * No DB imports, no Node.js-only modules.
 * Used by middleware for JWT validation only.
 */
import type { NextAuthConfig } from "next-auth";

type AuthUserLike = {
  id?: string;
  planSlug?: string;
  creditsRemaining?: number;
  isEmailVerified?: boolean;
};

export function applyUserToToken(token: Record<string, unknown>, user?: AuthUserLike) {
  if (user?.id) {
    token.id = user.id;
    token.planSlug = user.planSlug ?? "free";
    token.creditsRemaining = user.creditsRemaining ?? 0;
    token.isEmailVerified = user.isEmailVerified ?? false;
  }

  // Ensure id is present for existing JWTs where only `sub` is available.
  if (!token.id && typeof token.sub === "string") {
    token.id = token.sub;
  }

  return token;
}

export function applyRefreshToToken(
  token: Record<string, unknown>,
  refresh: { planSlug?: string; creditsRemaining?: number }
) {
  if (typeof refresh.planSlug === "string") {
    token.planSlug = refresh.planSlug;
  }

  if (typeof refresh.creditsRemaining === "number") {
    token.creditsRemaining = refresh.creditsRemaining;
  }

  return token;
}

export function applyTokenToSession(
  session: { user: Record<string, unknown>; [key: string]: unknown },
  token?: Record<string, unknown>
) {
  if (!token) {
    return session;
  }

  if (token.id !== undefined && token.id !== null) {
    session.user.id = token.id as string;
  }
  session.user.planSlug = (token.planSlug as string) ?? "free";
  session.user.creditsRemaining = (token.creditsRemaining as number) ?? 0;
  session.user.isEmailVerified = (token.isEmailVerified as boolean) ?? false;

  return session;
}

export const authConfig: NextAuthConfig = {
  providers: [], // Providers with DB access are defined in auth.ts only
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const protectedPrefixes = [
        "/dashboard",
        "/onboarding",
        "/api/user",
        "/api/curations",
        "/api/notifications",
        "/api/payments",
      ];

      if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
        return !!auth?.user;
      }
      return true;
    },
    jwt({ token, user }) {
      return applyUserToToken(token as Record<string, unknown>, user as AuthUserLike | undefined);
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
