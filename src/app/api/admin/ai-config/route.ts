import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { encryptField, decryptField } from "@/lib/server-utils";
import { invalidateAiConfig } from "@/lib/cache";
import { aiConfigSchema } from "@/lib/validations/admin/ai-config";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;
  const session = await verifyAdminSession(sessionCookie.value);
  if (!session?.totpVerified) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await db.aiConfig.findUnique({ where: { id: "default" } });

  if (!config) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    baseUrl: config.baseUrl,
    modelName: config.modelName,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    updatedAt: config.updatedAt,
    hasApiKey: !!config.apiKey,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = aiConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { baseUrl, apiKey, modelName, maxTokens, temperature } = parsed.data;

  const updateData: Record<string, unknown> = {
    baseUrl,
    modelName,
    maxTokens,
    temperature,
    updatedById: session.adminId,
    updatedAt: new Date(),
  };

  // Only update API key if a new one was provided
  if (apiKey && apiKey.trim() !== "") {
    updateData.apiKey = encryptField(apiKey.trim());
  }

  await db.aiConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      baseUrl: baseUrl as string,
      modelName: modelName as string,
      maxTokens: maxTokens as number,
      temperature: temperature as number,
      updatedById: session.adminId,
      updatedAt: new Date(),
      apiKey: apiKey ? encryptField(apiKey.trim()) : "",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: updateData as any,
  });

  // Invalidate cache so next curation uses the new config
  await invalidateAiConfig();

  return NextResponse.json({ success: true });
}
