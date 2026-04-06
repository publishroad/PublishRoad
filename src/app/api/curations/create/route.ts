import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildRateLimitIdentifiers, checkRateLimitForIdentifiers, curationLimiter } from "@/lib/rate-limit";
import { createCurationSchema } from "@/lib/validations/curation";
import { runCuration } from "@/lib/curation-engine";
import { attachHireUsCuration } from "@/lib/hire-us";
import { inspectWebsiteMetadata } from "@/lib/website-metadata";

export const maxDuration = 60;
const SITE_VALIDATION_MAX_WAIT_MS = 1200;

async function getSiteValidationWithSoftTimeout(productUrl: string) {
  const validationPromise = inspectWebsiteMetadata(productUrl).catch(() => null);

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SITE_VALIDATION_MAX_WAIT_MS);
  });

  return Promise.race([validationPromise, timeoutPromise]);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limit
  const identifiers = buildRateLimitIdentifiers(req, {
    scope: "curation-create",
    userId,
  });
  const rl = await checkRateLimitForIdentifiers(curationLimiter, identifiers);
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

  const {
    productUrl,
    countryId: rawCountryId,
    categoryId,
    keywords,
    problemStatement,
    solutionStatement,
    hireUs,
    hireUsPackage,
  } = parsed.data;
  const countryId = rawCountryId === "worldwide" ? null : rawCountryId;
  const combinedDescription = `Problem Statement: ${problemStatement}\n\nSolution Statement: ${solutionStatement}`;

  const siteValidationPromise = getSiteValidationWithSoftTimeout(productUrl);

  // Check credits with SELECT FOR UPDATE (handled in engine)
  try {
    const curation = await runCuration({
      userId,
      productUrl,
      countryId,
      categoryId,
      keywords,
      problemStatement,
      solutionStatement,
      description: combinedDescription,
    });

    if (hireUs && hireUsPackage) {
      await attachHireUsCuration({
        userId,
        curationId: curation.id,
        packageSlug: hireUsPackage,
      }).catch((error) => {
        console.error("Failed to attach hire-us curation to lead", error);
      });
    }

    const siteValidation = await siteValidationPromise;

    return NextResponse.json({ curationId: curation.id, siteValidation }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
    console.error("Curation error:", error);
    return NextResponse.json({ error: "Failed to start curation" }, { status: 500 });
  }
}
