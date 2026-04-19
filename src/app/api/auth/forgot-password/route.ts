import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { enqueueEmailJob } from "@/lib/email/queue";
import {
  buildRateLimitIdentifiers,
  checkRateLimitForIdentifiers,
  passwordResetLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { runIdempotentJson } from "@/lib/idempotency";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  const ip = getClientIp(request);

  return runIdempotentJson({
    request,
    scope: "forgot-password",
    payload: parsed.success ? parsed.data : body,
    clientIp: ip,
    execute: async () => {
      if (!parsed.success) {
        return {
          status: 422,
          body: {
            success: false,
            error: "Invalid email address.",
          },
        };
      }

      const { email } = parsed.data;

      const identifiers = buildRateLimitIdentifiers(request, {
        scope: "password-reset",
      });
      identifiers.push(`password-reset:email:${email}`);

      const { success } = await checkRateLimitForIdentifiers(passwordResetLimiter, identifiers);
      if (!success) {
        return {
          status: 429,
          body: {
            success: false,
            error: "Too many reset attempts. Please try again later.",
          },
        };
      }

      const user = await db.user.findFirst({
        where: { email, deletedAt: null, authProvider: "email" },
      });

      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: "No user found with this email.",
          },
        };
      }

      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });

      await enqueueEmailJob("password_reset", {
        to: email,
        name: user.name ?? "there",
        token,
      });

      return {
        status: 200,
        body: {
          success: true,
          message: "Password reset email sent.",
        },
      };
    },
  });
}
