import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/server-utils";

export type LoginCheckCode =
  | "OK"
  | "EMAIL_NOT_FOUND"
  | "SOCIAL_LOGIN_ONLY"
  | "ACCOUNT_LOCKED"
  | "WRONG_PASSWORD";

type LoginEvaluatorOptions = {
  recordFailures?: boolean;
};

export type LoginEvaluationResult =
  | {
      code: "OK";
      user: {
        id: string;
        email: string;
        name: string | null;
        planSlug: string;
        creditsRemaining: number;
        isEmailVerified: boolean;
      };
    }
  | { code: Exclude<LoginCheckCode, "OK"> };

export async function evaluateLoginCredentials(
  email: string,
  password: string,
  options: LoginEvaluatorOptions = {}
): Promise<LoginEvaluationResult> {
  const user = await db.user.findFirst({
    where: { email, deletedAt: null },
    include: { plan: true },
  });

  if (!user) {
    return { code: "EMAIL_NOT_FOUND" };
  }

  if (user.authProvider === "google" || !user.passwordHash) {
    return { code: "SOCIAL_LOGIN_ONLY" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { code: "ACCOUNT_LOCKED" };
  }

  const isValid = await verifyPassword(user.passwordHash, password);

  if (!isValid) {
    if (options.recordFailures) {
      const newCount = user.failedLoginCount + 1;
      const lockedUntil = newCount >= 15 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginCount: newCount, ...(lockedUntil ? { lockedUntil } : {}) },
      });
    }
    return { code: "WRONG_PASSWORD" };
  }

  if (options.recordFailures && (user.failedLoginCount > 0 || user.lockedUntil)) {
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  return {
    code: "OK",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      planSlug: user.plan?.slug ?? "free",
      creditsRemaining: user.creditsRemaining,
      isEmailVerified: !!user.emailVerifiedAt,
    },
  };
}
