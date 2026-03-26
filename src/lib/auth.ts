import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { loginSchema } from "./validations/auth";
import { applyRefreshToToken, authConfig } from "./auth.config";
import { evaluateLoginCredentials } from "./login-evaluator";
import { verifyPassword } from "./server-utils";

class LoginCredentialsError extends CredentialsSignin {
  code: string;

  constructor(code: string) {
    super();
    this.code = code;
  }
}

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

        const result = await evaluateLoginCredentials(email, password, { recordFailures: true });

        if (result.code === "OK") {
          return result.user;
        }

        if (result.code === "EMAIL_NOT_FOUND") {
          throw new LoginCredentialsError("email_not_found");
        }

        if (result.code === "SOCIAL_LOGIN_ONLY") {
          throw new LoginCredentialsError("social_login_only");
        }

        if (result.code === "ACCOUNT_LOCKED") {
          throw new LoginCredentialsError("account_locked");
        }

        throw new LoginCredentialsError("wrong_password");
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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

    async jwt(params) {
      let token = params.token;

      if (authConfig.callbacks?.jwt) {
        token = (await authConfig.callbacks.jwt(params)) as typeof token;
      }

      // Refresh user data at most once per hour per token.
      if (token.id) {
        const now = Math.floor(Date.now() / 1000);
        const lastRefresh = Number(token.userRefreshedAt ?? token.iat ?? 0);

        if (now - lastRefresh > 3600) {
          const freshUser = await db.user.findUnique({
            where: { id: token.id as string },
            include: { plan: true },
          });
          if (freshUser) {
            applyRefreshToToken(token as Record<string, unknown>, {
              planSlug: freshUser.plan?.slug ?? "free",
              creditsRemaining: freshUser.creditsRemaining,
            });
          }

          token.userRefreshedAt = now;
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
