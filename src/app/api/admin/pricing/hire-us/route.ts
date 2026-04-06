import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getHireUsPricingConfig, setHireUsPricingConfig } from "@/lib/hire-us-config";
import { normalizeHireUsPricingConfig } from "@/lib/hire-us-config-shared";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

const bodySchema = z.object({
  config: z.object({
    starter: z.object({
      priceCents: z.number().int().min(100).max(5000000),
      includes: z.array(z.string().trim().min(1).max(180)).min(1).max(12),
    }),
    complete: z.object({
      priceCents: z.number().int().min(100).max(5000000),
      includes: z.array(z.string().trim().min(1).max(180)).min(1).max(12),
    }),
    faq: z.array(
      z.object({
        q: z.string().trim().min(1).max(160),
        a: z.string().trim().min(1).max(600),
      })
    ).min(1).max(10),
  }),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getHireUsPricingConfig();
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

  const normalized = normalizeHireUsPricingConfig(parsed.data.config);
  const saved = await setHireUsPricingConfig({
    config: normalized,
    adminId: session.adminId,
  });

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
      body: JSON.stringify({ path: "/pricing" }),
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ success: true, config: saved });
}
