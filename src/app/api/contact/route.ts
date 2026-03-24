import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { unauthLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

const contactSchema = z.object({
  name: z.string().min(2).max(100).transform((n) => n.trim()),
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  subject: z.string().min(1).max(255).transform((s) => s.trim()),
  message: z.string().min(10).max(5000).transform((m) => m.trim()),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(unauthLimiter, `contact:${ip}`);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const { name, email, subject, message } = parsed.data;

  await db.contactSubmission.create({
    data: { name, email, subject, message },
  });

  // Notify admin
  sendEmail({
    to: "support@publishroad.com",
    subject: `New contact form: ${subject}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  }).catch(console.error);

  return NextResponse.json({ success: true });
}
