import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { testAiConnection } from "@/lib/ai";
import { db } from "@/lib/db";
import { decryptField, encryptField } from "@/lib/server-utils";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;
  const session = await verifyAdminSession(sessionCookie.value);
  if (!session?.totpVerified) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Use provided values or fall back to stored config
  let { baseUrl, apiKey, modelName } = body;

  if (!apiKey) {
    const stored = await db.aiConfig.findUnique({ where: { id: "default" } });
    if (stored?.apiKey) {
      apiKey = decryptField(stored.apiKey);
    }
  }

  if (!baseUrl || !apiKey || !modelName) {
    return NextResponse.json(
      { message: "Missing required fields (baseUrl, apiKey, modelName)" },
      { status: 400 }
    );
  }

  const result = await testAiConnection({ baseUrl, apiKey, modelName });

  if (result.success) {
    return NextResponse.json({ message: result.message });
  } else {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }
}
