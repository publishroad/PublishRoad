import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { encryptField } from "@/lib/server-utils";
import { emailConfigSchema } from "@/lib/validations/admin/email-config";
import { isMissingRelationError } from "@/lib/db-error-utils";

type EmailConfigRow = {
  provider: "resend" | "smtp" | "sendgrid" | "ses";
  from_address: string;
  api_key: string | null;
  host: string | null;
  port: number | null;
  username: string | null;
  password: string | null;
  use_tls: boolean;
  additional_config: unknown;
  updated_at: Date;
};


export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rows: EmailConfigRow[] = [];
  try {
    rows = await db.$queryRaw<EmailConfigRow[]>`
      SELECT provider, from_address, api_key, host, port, username, password, use_tls, additional_config, updated_at
      FROM email_provider_config
      WHERE id = 'default'
      LIMIT 1
    `;
  } catch (error) {
    if (isMissingRelationError(error, "email_provider_config")) {
      return NextResponse.json(
        { error: "Email settings migration is missing. Run Prisma migrations and refresh." },
        { status: 503 }
      );
    }
    throw error;
  }

  const config = rows[0] ?? null;

  if (!config) {
    return NextResponse.json({
      provider: "resend",
      fromAddress: "PublishRoad <noreply@publishroad.com>",
      host: "",
      port: null,
      username: "",
      useTls: true,
      additionalConfig: {},
      hasApiKey: false,
      hasPassword: false,
      updatedAt: null,
    });
  }

  return NextResponse.json({
    provider: config.provider,
    fromAddress: config.from_address,
    host: config.host ?? "",
    port: config.port,
    username: config.username ?? "",
    useTls: config.use_tls,
    additionalConfig: config.additional_config ?? {},
    hasApiKey: !!config.api_key,
    hasPassword: !!config.password,
    updatedAt: config.updated_at,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = emailConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const {
    provider,
    fromAddress,
    apiKey,
    host,
    port,
    username,
    password,
    useTls,
    additionalConfig,
  } = parsed.data;

  const encryptedApiKey =
    typeof apiKey === "string" && apiKey.trim().length > 0
      ? encryptField(apiKey.trim())
      : null;

  const encryptedPassword =
    typeof password === "string" && password.trim().length > 0
      ? encryptField(password.trim())
      : null;

  try {
    await db.$executeRaw`
      INSERT INTO email_provider_config (
        id, provider, from_address, api_key, host, port, username, password, use_tls, additional_config, updated_by_id, updated_at
      )
      VALUES (
        'default',
        ${provider}::"EmailProvider",
        ${fromAddress.trim()},
        ${encryptedApiKey},
        ${host?.trim() ? host.trim() : null},
        ${port ?? null},
        ${username?.trim() ? username.trim() : null},
        ${encryptedPassword},
        ${useTls},
        ${JSON.stringify(additionalConfig ?? {})}::jsonb,
        ${session.adminId},
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        provider = EXCLUDED.provider,
        from_address = EXCLUDED.from_address,
        api_key = COALESCE(EXCLUDED.api_key, email_provider_config.api_key),
        host = EXCLUDED.host,
        port = EXCLUDED.port,
        username = EXCLUDED.username,
        password = COALESCE(EXCLUDED.password, email_provider_config.password),
        use_tls = EXCLUDED.use_tls,
        additional_config = EXCLUDED.additional_config,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = NOW()
    `;
  } catch (error) {
    if (isMissingRelationError(error, "email_provider_config")) {
      return NextResponse.json(
        { error: "Email settings migration is missing. Run Prisma migrations and refresh." },
        { status: 503 }
      );
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
