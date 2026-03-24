import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import Stripe from "stripe";

export async function GET() {
  const checks: Record<string, "ok" | "error" | "skipped"> = {};

  const gatewayConfig = await db.paymentGatewayConfig.findUnique({
    where: { id: "default" },
    select: { provider: true },
  });

  const emailConfigRows = await db.$queryRaw<Array<{ provider: "resend" | "smtp" | "sendgrid" | "ses"; api_key: string | null }>>`
    SELECT provider, api_key
    FROM email_provider_config
    WHERE id = 'default'
    LIMIT 1
  `;
  const emailConfig = emailConfigRows[0] ?? null;

  // DB check
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Redis check
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  // Stripe check (non-blocking in local/dev)
  if (gatewayConfig && gatewayConfig.provider !== "stripe") {
    checks.stripe = "skipped";
  } else if (process.env.NODE_ENV !== "production") {
    checks.stripe = "skipped";
  } else if (!process.env.STRIPE_SECRET_KEY) {
    checks.stripe = "skipped";
  } else {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-02-25.clover",
      });
      await stripe.balance.retrieve();
      checks.stripe = "ok";
    } catch {
      checks.stripe = "error";
    }
  }

  // Email check (non-blocking in local/dev)
  const emailProvider = emailConfig?.provider ?? "resend";
  if (process.env.NODE_ENV !== "production") {
    checks.email = "skipped";
  } else if (emailProvider !== "resend") {
    checks.email = "skipped";
  } else if (!emailConfig?.api_key && !process.env.RESEND_API_KEY) {
    checks.email = "error";
  } else {
    checks.email = "ok";
  }

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "skipped");

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
