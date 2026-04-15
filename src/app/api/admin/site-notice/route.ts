import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getSiteNoticeConfig, setSiteNoticeConfig } from "@/lib/site-notice-config";
import { normalizeSiteNoticeConfig } from "@/lib/site-notice-config-shared";

const bodySchema = z.object({
  config: z.object({
    enabled: z.boolean(),
    message: z.string().max(220),
    ctaLabel: z.string().max(60),
    ctaUrl: z.string().max(500),
  }),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getSiteNoticeConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }

  const normalized = normalizeSiteNoticeConfig(parsed.data.config);

  if (normalized.enabled && (!normalized.message || !normalized.ctaLabel || !normalized.ctaUrl)) {
    return NextResponse.json(
      { error: "Message, CTA label, and CTA URL are required when notice is enabled" },
      { status: 422 }
    );
  }

  const saved = await setSiteNoticeConfig({
    config: normalized,
    adminId: session.adminId,
  });

  return NextResponse.json({ success: true, config: saved });
}
