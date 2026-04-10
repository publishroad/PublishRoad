import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import {
  ALL_CURATION_SECTIONS,
  getGlobalEnabledCurationSections,
  normalizeEnabledCurationSections,
  setGlobalEnabledCurationSections,
} from "@/lib/curation-steps-config";

const payloadSchema = z.object({
  enabledSections: z.array(z.enum(ALL_CURATION_SECTIONS)).min(1),
});


export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enabledSections = await getGlobalEnabledCurationSections();
  return NextResponse.json({ enabledSections });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }

  const enabledSections = normalizeEnabledCurationSections(parsed.data.enabledSections);
  await setGlobalEnabledCurationSections({
    sections: enabledSections,
    adminId: session.adminId,
  });

  return NextResponse.json({ success: true, enabledSections });
}
