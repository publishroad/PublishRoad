import NextAuth, { type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { loginSchema } from "./validations/auth";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./server-utils";

// ─────────────────────────────────────────────
// Extend session types
// ─────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      planSlug: string;
      creditsRemaining: number;
      isEmailVerified: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    planSlug?: string;
    creditsRemaining?: number;
    isEmailVerified?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findFirst({
          where: { email, deletedAt: null },
          include: { plan: true },
        });

        if (!user || !user.passwordHash) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Account locked. Please try again later.");
        }

        const isValid = await verifyPassword(user.passwordHash, password);

        if (!isValid) {
          const newCount = user.failedLoginCount + 1;
          const lockedUntil = newCount >= 15 ? new Date(Date.now() + 30 * 60 * 1000) : null;
          await db.user.update({
            where: { id: user.id },
            data: { failedLoginCount: newCount, ...(lockedUntil ? { lockedUntil } : {}) },
          });
          return null;
        }

        // Only reset failed-login counter if it was actually non-zero (saves a DB write)
        if (user.failedLoginCount > 0 || user.lockedUntil) {
          await db.user.update({
            where: { id: user.id },
            data: { failedLoginCount: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          planSlug: user.plan?.slug ?? "free",
          creditsRemaining: user.creditsRemaining,
          isEmailVerified: !!user.emailVerifiedAt,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await db.user.findFirst({
          where: { email: user.email!, deletedAt: null },
        });

        if (existingUser) {
          if (existingUser.authProvider === "email") {
            return `/login?error=account_exists&email=${encodeURIComponent(user.email!)}`;
          }
          user.id = existingUser.id;
          return true;
        }

        const newUser = await db.user.create({
          data: {
            email: user.email!,
            name: user.name,
            authProvider: "google",
            emailVerifiedAt: new Date(),
            creditsRemaining: 1,
          },
        });
        user.id = newUser.id;
        return true;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.planSlug = user.planSlug ?? "free";
        token.creditsRemaining = user.creditsRemaining ?? 0;
        token.isEmailVerified = user.isEmailVerified ?? false;
      }

      // Refresh user data every hour
      if (token.id && token.iat) {
        const age = Date.now() / 1000 - (token.iat as number);
        if (age > 3600) {
          const freshUser = await db.user.findUnique({
            where: { id: token.id as string },
            include: { plan: true },
          });
          if (freshUser) {
            token.planSlug = freshUser.plan?.slug ?? "free";
            token.creditsRemaining = freshUser.creditsRemaining;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.planSlug = (token.planSlug as string) ?? "free";
        session.user.creditsRemaining = (token.creditsRemaining as number) ?? 0;
        session.user.isEmailVerified = (token.isEmailVerified as boolean) ?? false;
      }
      return session;
    },
  },
});

// ─────────────────────────────────────────────
// Admin auth helpers (Node.js only)
// ─────────────────────────────────────────────
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<{ id: string; name: string; email: string; totpEnabled: boolean } | null> {
  const admin = await db.adminUser.findUnique({
    where: { email: email.toLowerCase().trim(), isActive: true },
  });

  if (!admin) return null;

  const isValid = await verifyPassword(password, admin.passwordHash);
  if (!isValid) return null;

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    totpEnabled: admin.totpEnabled,
  };
}
