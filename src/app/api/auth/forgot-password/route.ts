import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { passwordResetLimiter, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    // Always return 200 to prevent email enumeration
    return NextResponse.json({ success: true });
  }

  const { email } = parsed.data;

  // Rate limit: 3 requests per hour per email
  const { success } = await checkRateLimit(passwordResetLimiter, email);
  if (!success) {
    return NextResponse.json({ success: true }); // Silent rate limit (no leaking info)
  }

  const user = await db.user.findFirst({
    where: { email, deletedAt: null, authProvider: "email" },
  });

  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    sendPasswordResetEmail(email, user.name ?? "there", token).catch(
      console.error
    );
  }

  // Always return 200 — never reveal if email exists
  return NextResponse.json({ success: true });
}
