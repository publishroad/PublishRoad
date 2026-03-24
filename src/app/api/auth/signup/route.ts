import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { isDisposableEmail } from "@/lib/utils"
import { hashPassword } from "@/lib/server-utils";
import { signupSchema } from "@/lib/validations/auth";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { signupLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 5 signups per minute per IP
  const ip = getClientIp(request);
  const { success, headers, retryAfter } = await checkRateLimit(signupLimiter, ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429, headers }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const { name, email, password } = parsed.data;

  // Block disposable email addresses
  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { error: "Please use a real email address." },
      { status: 422 }
    );
  }

  // Check if user already exists
  const existing = await db.user.findFirst({
    where: { email },
  });

  if (existing) {
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "This account has been deleted. Please contact support." },
        { status: 409 }
      );
    }
    // Account exists with Google auth
    if (existing.authProvider === "google") {
      return NextResponse.json(
        { error: "An account with this email already exists via Google. Please sign in with Google." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const verifyToken = randomBytes(32).toString("hex");

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      authProvider: "email",
      creditsRemaining: 1,
      emailVerifyToken: verifyToken,
    },
  });

  // Send verification email (non-blocking)
  sendVerificationEmail(email, name, verifyToken).catch(console.error);

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, name).catch(console.error);

  return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
}
