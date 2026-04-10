import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { findWebsiteDomainConflicts } from "@/lib/admin/website-domain-duplicates";


const payloadSchema = z.object({
  url: z.string().min(1),
  excludeWebsiteId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { domain, conflicts } = await findWebsiteDomainConflicts({
    url: parsed.data.url,
    excludeWebsiteId: parsed.data.excludeWebsiteId,
  });

  return NextResponse.json({
    domain,
    duplicate: conflicts.length > 0,
    conflicts,
  });
}
