import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getHireUsPricingConfig, setHireUsPricingConfig } from "@/lib/hire-us-config";
import { normalizeHireUsPricingConfig } from "@/lib/hire-us-config-shared";


const bodySchema = z.object({
  config: z.object({
    starter: z.object({
      priceCents: z.number().int().min(100).max(5000000),
      compareAtPriceCents: z.number().int().min(100).max(5000000).nullable().optional(),
      includes: z.array(z.string().trim().min(1).max(180)).min(1).max(12),
    }).refine((v) => v.compareAtPriceCents == null || v.compareAtPriceCents >= v.priceCents, {
      message: "Starter actual/list price must be greater than or equal to offer price",
      path: ["compareAtPriceCents"],
    }),
    complete: z.object({
      priceCents: z.number().int().min(100).max(5000000),
      compareAtPriceCents: z.number().int().min(100).max(5000000).nullable().optional(),
      includes: z.array(z.string().trim().min(1).max(180)).min(1).max(12),
    }).refine((v) => v.compareAtPriceCents == null || v.compareAtPriceCents >= v.priceCents, {
      message: "Complete actual/list price must be greater than or equal to offer price",
      path: ["compareAtPriceCents"],
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
