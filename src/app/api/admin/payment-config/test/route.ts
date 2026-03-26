import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/server-utils";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  if (!session?.totpVerified) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await req.json().catch(() => ({})) as { provider?: string };
  if (provider !== "paypal") {
    return NextResponse.json({ error: "Only PayPal test supported right now" }, { status: 400 });
  }

  const rows = await db.$queryRaw<Array<{
    public_key: string | null;
    secret_key: string | null;
    is_active: boolean;
    additional_config: unknown;
  }>>`
    SELECT public_key, secret_key, is_active, additional_config
    FROM payment_gateway_config
    WHERE id = 'paypal'
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ success: false, error: "No PayPal row found in database. Save credentials first." });
  }

  const clientId = row.public_key?.trim() ?? "";
  const additionalConfig = (typeof row.additional_config === "object" && row.additional_config !== null)
    ? row.additional_config as Record<string, unknown>
    : {};
  const mode = typeof additionalConfig.mode === "string" ? additionalConfig.mode : "live";

  // Decrypt secret
  let secret = "";
  try {
    secret = row.secret_key ? decryptField(row.secret_key) : "";
  } catch {
    return NextResponse.json({
      success: false,
      error: "Failed to decrypt secret key — it may be corrupted. Re-enter the secret and save again.",
      debug: { hasPublicKey: !!clientId, hasSecretKey: !!row.secret_key, mode, isActive: row.is_active },
    });
  }

  if (!clientId) {
    return NextResponse.json({ success: false, error: "Client ID (Public Key) is empty.", debug: { mode, isActive: row.is_active } });
  }
  if (!secret) {
    return NextResponse.json({ success: false, error: "Secret Key is empty after decryption.", debug: { mode, isActive: row.is_active } });
  }

  // Try PayPal auth
  const baseUrl = mode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  try {
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = await res.json() as { access_token?: string; error?: string; error_description?: string };

    if (data.access_token) {
      return NextResponse.json({
        success: true,
        message: `PayPal ${mode} credentials are valid.`,
        debug: { mode, isActive: row.is_active, clientIdPrefix: clientId.slice(0, 8) + "..." },
      });
    }

    return NextResponse.json({
      success: false,
      error: `PayPal returned: ${data.error} — ${data.error_description ?? ""}`,
      debug: { mode, isActive: row.is_active, clientIdPrefix: clientId.slice(0, 8) + "...", clientIdLength: clientId.length, secretLength: secret.length },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: `Network error: ${err instanceof Error ? err.message : String(err)}` });
  }
}
