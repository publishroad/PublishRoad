import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, curationLimiter, getClientIp } from "@/lib/rate-limit";
import { createCurationSchema } from "@/lib/validations/curation";
import { runCuration } from "@/lib/curation-engine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limit
  const ip = getClientIp(req);
  const rl = await checkRateLimit(curationLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Validate input
  const body = await req.json().catch(() => null);
  const parsed = createCurationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { productUrl, countryId, categoryId, keywords, description } = parsed.data;

  // Check credits with SELECT FOR UPDATE (handled in engine)
  try {
    const curation = await runCuration({
      userId,
      productUrl,
      countryId,
      categoryId,
      keywords,
      description: description ?? null,
    });

    return NextResponse.json({ curationId: curation.id }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
    console.error("Curation error:", error);
    return NextResponse.json({ error: "Failed to start curation" }, { status: 500 });
  }
}
