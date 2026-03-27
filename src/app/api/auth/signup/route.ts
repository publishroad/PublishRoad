import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { isDisposableEmail } from "@/lib/utils"
import { hashPassword } from "@/lib/server-utils";
import { signupSchema } from "@/lib/validations/auth";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { signupLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 signups per minute per IP
    const ip = getClientIp(request);
    const { success, headers } = await checkRateLimit(signupLimiter, ip);

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

    let existing: { id: string; authProvider: "email" | "google"; deletedAt: Date | null } | { id: string } | null = null;

    try {
      existing = await db.user.findFirst({
        where: { email },
        select: {
          id: true,
          authProvider: true,
          deletedAt: true,
        },
      });
    } catch {
      // Fallback for drifted schemas where one of the optional account-state columns is missing.
      existing = await db.user.findFirst({
        where: { email },
        select: { id: true },
      });
    }

    if (existing) {
      if ("deletedAt" in existing && existing.deletedAt) {
        return NextResponse.json(
          { error: "This account has been deleted. Please contact support." },
          { status: 409 }
        );
      }
      if ("authProvider" in existing && existing.authProvider === "google") {
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

    void Promise.allSettled([
      sendVerificationEmail(email, name, verifyToken),
      sendWelcomeEmail(email, name),
    ]).then((emailResults) => {
      if (emailResults[0].status === "rejected") {
        console.error("Failed to send verification email:", emailResults[0].reason);
      }
      if (emailResults[1].status === "rejected") {
        console.error("Failed to send welcome email:", emailResults[1].reason);
      }
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json(
      { error: "Signup temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
