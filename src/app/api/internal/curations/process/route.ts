import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { processCuration } from "@/lib/curation-engine";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/internal/curations/process
 *
 * Receives a QStash job and processes a curation asynchronously.
 * Secured by:
 *   1. QStash signature verification (QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY)
 *   2. Bearer token (CURATION_QUEUE_SECRET) for direct/local calls
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const isQStashCall = req.headers.get("upstash-signature") !== null;

  if (isQStashCall) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!currentSigningKey || !nextSigningKey) {
      console.error("[CurationQueue] QSTASH signing keys not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const receiver = new Receiver({ currentSigningKey, nextSigningKey });

    const isValid = await receiver
      .verify({
        signature: req.headers.get("upstash-signature") ?? "",
        body,
      })
      .catch(() => false);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
    }
  } else {
    // Direct call (e.g. local dev, cron) — require bearer token
    const secret = process.env.CURATION_QUEUE_SECRET?.trim();
    if (!secret) {
      return NextResponse.json({ error: "CURATION_QUEUE_SECRET not configured" }, { status: 500 });
    }

    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token || token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: {
    curationId: string;
    userId: string;
    productUrl: string;
    keywords: string[];
    problemStatement: string;
    solutionStatement: string;
    description: string | null;
    countryId?: string | null;
    categoryId?: string | null;
    enabledSectionsSnapshot: string[];
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    curationId,
    userId,
    productUrl,
    keywords,
    problemStatement,
    solutionStatement,
    description,
    countryId,
    categoryId,
    enabledSectionsSnapshot,
  } = payload;

  if (!curationId || !userId || !productUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await processCuration(
    curationId,
    userId,
    productUrl,
    keywords ?? [],
    problemStatement ?? "",
    solutionStatement ?? "",
    description ?? null,
    countryId ?? null,
    categoryId ?? null,
    (enabledSectionsSnapshot as ("a" | "b" | "c" | "d" | "e" | "f")[]) ?? ["a", "b", "c", "d", "e", "f"]
  );

  return NextResponse.json({ success: true });
}
