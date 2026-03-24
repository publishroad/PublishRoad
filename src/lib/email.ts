import { Resend } from "resend";
import React from "react";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY env var not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "PublishRoad <noreply@publishroad.com>";

// ─────────────────────────────────────────────
// Generic email sender
// ─────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  react,
  text,
}: {
  to: string;
  subject: string;
  react?: React.ReactElement;
  text?: string;
}): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    react,
    text,
  });

  if (error) {
    console.error("[Email] Failed to send:", error);
    // Don't throw — email failure should not block the main flow
  }
}

// ─────────────────────────────────────────────
// Convenience senders
// ─────────────────────────────────────────────
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const { VerifyEmailTemplate } = await import(
    "@/emails/verify-email"
  );
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your PublishRoad email",
    react: React.createElement(VerifyEmailTemplate, { name, verifyUrl }),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const { PasswordResetTemplate } = await import(
    "@/emails/password-reset"
  );
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your PublishRoad password",
    react: React.createElement(PasswordResetTemplate, { name, resetUrl }),
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const { WelcomeTemplate } = await import("@/emails/welcome");
  await sendEmail({
    to,
    subject: "Welcome to PublishRoad 🚀",
    react: React.createElement(WelcomeTemplate, { name }),
  });
}

export async function sendCurationCompleteEmail(
  to: string,
  name: string,
  curationId: string,
  productUrl: string
): Promise<void> {
  const { CurationCompleteTemplate } = await import(
    "@/emails/curation-complete"
  );
  const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/curations/${curationId}`;
  await sendEmail({
    to,
    subject: "Your PublishRoad curation is ready!",
    react: React.createElement(CurationCompleteTemplate, {
      name,
      productUrl,
      resultsUrl,
    }),
  });
}

export async function sendLowCreditsEmail(
  to: string,
  name: string,
  creditsRemaining: number
): Promise<void> {
  const { LowCreditsTemplate } = await import("@/emails/low-credits");
  await sendEmail({
    to,
    subject: `You have ${creditsRemaining} curation credit${creditsRemaining === 1 ? "" : "s"} remaining`,
    react: React.createElement(LowCreditsTemplate, {
      name,
      creditsRemaining,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    }),
  });
}
