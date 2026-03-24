/**
 * Edge-compatible NextAuth config.
 * No DB imports, no Node.js-only modules.
 * Used by middleware for JWT validation only.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [], // Providers with DB access are defined in auth.ts only
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // Dashboard requires a logged-in user
      if (pathname.startsWith("/dashboard")) {
        return !!auth?.user;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.planSlug = (user as { planSlug?: string }).planSlug ?? "free";
        token.creditsRemaining = (user as { creditsRemaining?: number }).creditsRemaining ?? 0;
        token.isEmailVerified = (user as { isEmailVerified?: boolean }).isEmailVerified ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.planSlug = (token.planSlug as string) ?? "free";
        session.user.creditsRemaining = (token.creditsRemaining as number) ?? 0;
        session.user.isEmailVerified = (token.isEmailVerified as boolean) ?? false;
      }
      return session;
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
