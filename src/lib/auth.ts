import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { db } from "./db";
import { loginSchema } from "./validations/auth";
import { applyRefreshToToken, authConfig } from "./auth.config";
import { evaluateLoginCredentials } from "./login-evaluator";
import { verifyPassword } from "./server-utils";
import { claimAffiliateReferralForUser, REFERRAL_CODE_COOKIE } from "@/lib/referrals/claim";
import {
  claimCreatorInviteForUser,
  CREATOR_INVITE_COOKIE,
  getCreatorInviteStatus,
  mapInviteStatusToQuery,
  normalizeInviteToken,
} from "@/lib/content-creators/invite";

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

        const result = await evaluateLoginCredentials(email, password, {
          recordFailures: true,
          loadProfile: true,
          useCache: false,
        });

        if (result.code === "OK") {
          return result.user;
        }

        throw new LoginCredentialsError("invalid_credentials");
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const cookieStore = await cookies();
        const referralCode = cookieStore.get(REFERRAL_CODE_COOKIE)?.value?.trim().toUpperCase();
        const inviteToken = normalizeInviteToken(cookieStore.get(CREATOR_INVITE_COOKIE)?.value);

        const existingUser = await db.user.findFirst({
          where: { email: user.email!, deletedAt: null },
        });

        if (existingUser) {
          if (inviteToken) {
            return `/signup?inviteError=invite_new_signup_only`;
          }

          if (existingUser.authProvider === "email") {
            return `/login?error=account_exists&email=${encodeURIComponent(user.email!)}`;
          }
          user.id = existingUser.id;

          if (referralCode) {
            await claimAffiliateReferralForUser({
              referredUserId: existingUser.id,
              referralCode,
            });
          }

          return true;
        }

        if (inviteToken) {
          const inviteStatus = await getCreatorInviteStatus(inviteToken);
          if (inviteStatus.status !== "valid") {
            return `/signup?inviteError=${mapInviteStatusToQuery(inviteStatus.status)}`;
          }
        }

        let newUser: { id: string };

        try {
          newUser = await db.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
              data: {
                email: user.email!,
                name: user.name,
                authProvider: "google",
                emailVerifiedAt: new Date(),
                creditsRemaining: 1,
              },
            });

            if (referralCode) {
              await claimAffiliateReferralForUser({
                referredUserId: createdUser.id,
                referralCode,
                tx,
              });
            }

            if (inviteToken) {
              const inviteClaimResult = await claimCreatorInviteForUser({
                referredUserId: createdUser.id,
                inviteToken,
                tx,
              });

              if (!inviteClaimResult.claimed) {
                throw new Error(`INVITE_${mapInviteStatusToQuery(inviteClaimResult.status)}`);
              }
            }

            return createdUser;
          });
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("INVITE_")) {
            return `/signup?inviteError=${error.message.replace("INVITE_", "")}`;
          }
          throw error;
        }

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

      // Always sync plan + credits from the DB so dashboard UI never shows stale account state.
      if (token.id) {
        const freshUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            creditsRemaining: true,
            emailVerifiedAt: true,
            plan: {
              select: {
                slug: true,
              },
            },
          },
        });

        if (freshUser) {
          applyRefreshToToken(token as Record<string, unknown>, {
            planSlug: freshUser.plan?.slug ?? "free",
            creditsRemaining: freshUser.creditsRemaining,
          });
          token.isEmailVerified = Boolean(freshUser.emailVerifiedAt);
        }

        token.userRefreshedAt = Math.floor(Date.now() / 1000);
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
