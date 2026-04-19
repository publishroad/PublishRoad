import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueEmailJob } from "@/lib/email/queue";
import {
  buildRateLimitIdentifiers,
  checkRateLimitForIdentifiers,
  emailVerificationResendLimiter,
  getClientIp,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const identifiers = buildRateLimitIdentifiers(request, {
    scope: "email-verification-resend",
    userId: session.user.id,
  });
  if (session.user.email) {
    identifiers.push(`email-verification-resend:email:${session.user.email.toLowerCase()}`);
  }

  const { success, headers } = await checkRateLimitForIdentifiers(emailVerificationResendLimiter, identifiers);
  if (!success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many verification resend attempts. Please try again later.",
      },
      { status: 429, headers }
    );
  }

  const user = await db.user.findFirst({
    where: {
      id: session.user.id,
      deletedAt: null,
      authProvider: "email",
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  const token = randomBytes(32).toString("hex");

  await db.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token },
  });

  await enqueueEmailJob("verification", {
    to: user.email,
    name: user.name ?? "there",
    token,
  });

  console.info("[EmailVerification] Verification email resent", {
    userId: user.id,
    email: user.email,
    ip: getClientIp(request),
  });

  return NextResponse.json({ success: true, queued: true });
}
