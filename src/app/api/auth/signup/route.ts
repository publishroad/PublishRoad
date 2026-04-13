import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isDisposableEmail } from "@/lib/utils"
import { hashPassword } from "@/lib/server-utils";
import { withDbRetry } from "@/lib/db-resilience";
import { signupSchema } from "@/lib/validations/auth";
import { enqueueEmailJob } from "@/lib/email/queue";
import {
  buildRateLimitIdentifiers,
  checkRateLimitForIdentifiers,
  getClientIp,
  signupLimiter,
  tryAcquireBackpressure,
} from "@/lib/rate-limit";
import { runIdempotentJson } from "@/lib/idempotency";
import {
  claimCreatorInviteForUser,
  CREATOR_INVITE_COOKIE,
  mapInviteStatusToQuery,
  normalizeInviteToken,
} from "@/lib/content-creators/invite";

const SIGNUP_MAX_INFLIGHT = Number(process.env.SIGNUP_MAX_INFLIGHT ?? 100);
const SIGNUP_CONFLICT_WAIT_MS = Number(process.env.SIGNUP_CONFLICT_WAIT_MS ?? 2500);
const SIGNUP_CONFLICT_POLL_MS = 120;

function isDuplicateEmailError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = (error.meta as { target?: string[] | string } | undefined)?.target;
  if (!target) {
    return true;
  }

  if (Array.isArray(target)) {
    return target.includes("email");
  }

  return String(target).includes("email");
}

function isConflictLikeDbError(error: unknown): boolean {
  if (isDuplicateEmailError(error)) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2034";
  }

  const dbCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (dbCode === "23505" || dbCode === "40001") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /duplicate|unique|already exists|conflict|serialization/i.test(message);
}

function logSignupError(error: unknown, context: string, extra?: Record<string, unknown>) {
  const details =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : {
          message: String(error),
        };

  console.error("[Signup] Failure", {
    context,
    ...extra,
    ...details,
  });
}

async function resolveExistingEmailConflict(email: string): Promise<boolean> {
  try {
    const existing = await withDbRetry(() =>
      db.user.findUnique({
        where: { email },
        select: { id: true },
      })
    );
    return !!existing;
  } catch (lookupError) {
    logSignupError(lookupError, "conflict-lookup", { email });
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExistingEmailConflict(email: string): Promise<boolean> {
  const deadline = Date.now() + SIGNUP_CONFLICT_WAIT_MS;

  while (Date.now() < deadline) {
    if (await resolveExistingEmailConflict(email)) {
      return true;
    }

    await sleep(SIGNUP_CONFLICT_POLL_MS);
  }

  return resolveExistingEmailConflict(email);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  const ip = getClientIp(request);

  return runIdempotentJson({
    request,
    scope: "signup",
    payload: parsed.success ? parsed.data : body,
    clientIp: ip,
    execute: async () => {
      try {
        const rateLimitIdentifiers = buildRateLimitIdentifiers(request, {
          scope: "signup",
        });

        const { success, headers } = await checkRateLimitForIdentifiers(signupLimiter, rateLimitIdentifiers);

        if (!success) {
          return {
            status: 429,
            headers,
            body: {
              success: false,
              error: {
                code: "RATE_LIMITED",
                message: "Too many signup attempts. Please try again later.",
              },
            },
          };
        }

        const release = tryAcquireBackpressure("signup", SIGNUP_MAX_INFLIGHT);
        if (!release) {
          return {
            status: 429,
            headers: { ...headers, "Retry-After": "1" },
            body: {
              success: false,
              error: {
                code: "RATE_LIMITED",
                message: "Server is busy. Please retry shortly.",
              },
            },
          };
        }

        try {
          if (!parsed.success) {
            return {
              status: 422,
              body: {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: parsed.error.issues[0]?.message ?? "Invalid input",
                },
              },
            };
          }

          const { name, email, password, referralCode } = parsed.data;
          const normalizedReferralCode = referralCode?.trim().toUpperCase() || null;
          const normalizedInviteToken = normalizeInviteToken(
            parsed.data.inviteToken || request.cookies.get(CREATOR_INVITE_COOKIE)?.value
          );

          if (isDisposableEmail(email)) {
            return {
              status: 422,
              body: {
                success: false,
                error: {
                  code: "INVALID_EMAIL",
                  message: "Please use a real email address.",
                },
              },
            };
          }

          const passwordHash = await hashPassword(password);
          const verifyToken = randomBytes(32).toString("hex");

          let user: { id: string };

          try {
            user = await withDbRetry(() =>
              db.$transaction(
                async (tx) => {
                  const createdUser = await tx.user.create({
                    data: {
                      name,
                      email,
                      passwordHash,
                      authProvider: "email",
                      creditsRemaining: 1,
                      emailVerifyToken: verifyToken,
                    },
                    select: { id: true },
                  });

                  if (normalizedReferralCode) {
                    const referrer = await tx.$queryRaw<Array<{ userId: string }>>`
                      SELECT user_id AS "userId"
                      FROM affiliate_profiles
                      WHERE referral_code = ${normalizedReferralCode}
                        AND is_active = true
                        AND is_disabled_by_admin = false
                      LIMIT 1
                    `;

                    const referrerUserId = referrer[0]?.userId;
                    if (referrerUserId && referrerUserId !== createdUser.id) {
                      await tx.$executeRaw`
                        INSERT INTO affiliate_referrals (
                          id,
                          referrer_user_id,
                          referred_user_id,
                          referral_code
                        )
                        VALUES (${randomBytes(16).toString("hex")}, ${referrerUserId}, ${createdUser.id}, ${normalizedReferralCode})
                        ON CONFLICT (referred_user_id) DO NOTHING
                      `;
                    }
                  }

                  if (normalizedInviteToken) {
                    const inviteClaimResult = await claimCreatorInviteForUser({
                      referredUserId: createdUser.id,
                      inviteToken: normalizedInviteToken,
                      tx,
                    });

                    if (!inviteClaimResult.claimed) {
                      throw new Error(`INVITE_${mapInviteStatusToQuery(inviteClaimResult.status)}`);
                    }
                  }

                  return createdUser;
                },
                {
                  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                }
              )
            );
          } catch (dbError) {
            if (dbError instanceof Error && dbError.message.startsWith("INVITE_")) {
              return {
                status: 422,
                body: {
                  success: false,
                  error: {
                    code: "INVITE_INVALID",
                    message:
                      dbError.message.replace("INVITE_", "") === "invite_limit"
                        ? "This creator invite has reached its limit."
                        : dbError.message.replace("INVITE_", "") === "invite_expired"
                        ? "This creator invite has expired."
                        : dbError.message.replace("INVITE_", "") === "invite_disabled"
                        ? "This creator invite is disabled."
                        : dbError.message.replace("INVITE_", "") === "invite_already_claimed"
                        ? "This account already has a creator referral assigned."
                        : dbError.message.replace("INVITE_", "") === "invite_unavailable"
                        ? "Invite-based Pro access is temporarily unavailable."
                        : "Invalid creator invite link.",
                  },
                },
              };
            }

            if (isConflictLikeDbError(dbError)) {
              return {
                status: 409,
                body: {
                  success: false,
                  error: {
                    code: "ACCOUNT_EXISTS",
                    message: "An account with this email already exists. Please sign in.",
                  },
                },
              };
            }

            if (await waitForExistingEmailConflict(email)) {
              return {
                status: 409,
                body: {
                  success: false,
                  error: {
                    code: "ACCOUNT_EXISTS",
                    message: "An account with this email already exists. Please sign in.",
                  },
                },
              };
            }

            logSignupError(dbError, "db-create", { email });
            return {
              status: 503,
              body: {
                success: false,
                error: {
                  code: "SIGNUP_UNAVAILABLE",
                  message: "Signup is temporarily unavailable. Please try again.",
                },
              },
            };
          }

          let emailQueued = true;

          try {
            await Promise.all([
              enqueueEmailJob("verification", {
                to: email,
                name,
                token: verifyToken,
              }),
              enqueueEmailJob("welcome", {
                to: email,
                name,
              }),
            ]);
          } catch (queueError) {
            emailQueued = false;
            logSignupError(queueError, "email-queue", { email, userId: user.id });
          }

          return {
            status: 201,
            body: {
              success: true,
              userId: user.id,
              emailQueued,
              emailDelivery: emailQueued ? "queued" : "queue_failed",
            },
          };
        } finally {
          release();
        }
      } catch (error) {
        if (isConflictLikeDbError(error)) {
          return {
            status: 409,
            body: {
              success: false,
              error: {
                code: "ACCOUNT_EXISTS",
                message: "An account with this email already exists. Please sign in.",
              },
            },
          };
        }

        if (parsed.success && (await waitForExistingEmailConflict(parsed.data.email))) {
          return {
            status: 409,
            body: {
              success: false,
              error: {
                code: "ACCOUNT_EXISTS",
                message: "An account with this email already exists. Please sign in.",
              },
            },
          };
        }

        logSignupError(error, "unhandled", { ip });
        return {
          status: 503,
          body: {
            success: false,
            error: {
              code: "SIGNUP_UNAVAILABLE",
              message: "Signup is temporarily unavailable. Please try again.",
            },
          },
        };
      }
    },
  });
}
