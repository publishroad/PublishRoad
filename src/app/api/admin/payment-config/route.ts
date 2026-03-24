import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { encryptField } from "@/lib/server-utils";
import { paymentConfigSchema } from "@/lib/validations/admin/payment-config";
import { isMissingRelationError } from "@/lib/db-error-utils";

type PaymentConfigRow = {
  provider: "stripe" | "razorpay" | "paypal";
  public_key: string | null;
  secret_key: string | null;
  webhook_secret: string | null;
  additional_config: unknown;
  updated_at: Date;
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;
  const session = await verifyAdminSession(sessionCookie.value);
  if (!session?.totpVerified) return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rows: PaymentConfigRow[] = [];
  try {
    rows = await db.$queryRaw<PaymentConfigRow[]>`
      SELECT provider, public_key, secret_key, webhook_secret, additional_config, updated_at
      FROM payment_gateway_config
      WHERE id = 'default'
      LIMIT 1
    `;
  } catch (error) {
    if (isMissingRelationError(error, "payment_gateway_config")) {
      return NextResponse.json(
        { error: "Payment settings migration is missing. Run Prisma migrations and refresh." },
        { status: 503 }
      );
    }
    throw error;
  }

  const config = rows[0] ?? null;
  if (!config) {
    return NextResponse.json({
      provider: "stripe",
      publicKey: "",
      hasSecretKey: false,
      hasWebhookSecret: false,
      additionalConfig: {},
      updatedAt: null,
    });
  }

  return NextResponse.json({
    provider: config.provider,
    publicKey: config.public_key ?? "",
    hasSecretKey: !!config.secret_key,
    hasWebhookSecret: !!config.webhook_secret,
    additionalConfig: config.additional_config ?? {},
    updatedAt: config.updated_at,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = paymentConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { provider, publicKey, secretKey, webhookSecret, additionalConfig } = parsed.data;

  const encryptedSecretKey =
    typeof secretKey === "string" && secretKey.trim().length > 0
      ? encryptField(secretKey.trim())
      : null;

  const encryptedWebhookSecret =
    typeof webhookSecret === "string" && webhookSecret.trim().length > 0
      ? encryptField(webhookSecret.trim())
      : null;

  try {
    await db.$executeRaw`
      INSERT INTO payment_gateway_config (
        id, provider, public_key, secret_key, webhook_secret, additional_config, updated_by_id, updated_at
      )
      VALUES (
        'default',
        ${provider}::"PaymentProvider",
        ${publicKey?.trim() ? publicKey.trim() : null},
        ${encryptedSecretKey},
        ${encryptedWebhookSecret},
        ${JSON.stringify(additionalConfig ?? {})}::jsonb,
        ${session.adminId},
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        provider = EXCLUDED.provider,
        public_key = EXCLUDED.public_key,
        secret_key = COALESCE(EXCLUDED.secret_key, payment_gateway_config.secret_key),
        webhook_secret = COALESCE(EXCLUDED.webhook_secret, payment_gateway_config.webhook_secret),
        additional_config = EXCLUDED.additional_config,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = NOW()
    `;
  } catch (error) {
    if (isMissingRelationError(error, "payment_gateway_config")) {
      return NextResponse.json(
        { error: "Payment settings migration is missing. Run Prisma migrations and refresh." },
        { status: 503 }
      );
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
