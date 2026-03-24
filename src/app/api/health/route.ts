import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import Stripe from "stripe";

export async function GET() {
  const checks: Record<string, "ok" | "error" | "skipped"> = {};

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
  if (process.env.NODE_ENV !== "production") {
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

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "skipped");

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
