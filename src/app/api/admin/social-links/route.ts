import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSocialLinksConfig, setSocialLinksConfig } from "@/lib/social-links-config";
import { socialLinksPayloadSchema } from "@/lib/validations/admin/social-links";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await getSocialLinksConfig();
  return NextResponse.json({ links });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = socialLinksPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }

  const links = await setSocialLinksConfig({
    links: parsed.data.links,
    adminId: session.adminId,
  });

  return NextResponse.json({ success: true, links });
}
