import { NextRequest, NextResponse } from "next/server";
import { processEmailQueueBatch } from "@/lib/email/queue";
import { isInternalQueueRequestAllowed, isQueueAuthorizationValid } from "@/lib/internal-endpoint-security";

export async function POST(request: NextRequest) {
  if (!isQueueAuthorizationValid(request)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  if (!isInternalQueueRequestAllowed(request)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  try {
    const maxJobs = Number(request.nextUrl.searchParams.get("max") ?? process.env.EMAIL_QUEUE_BATCH_SIZE ?? 25);
    const safeMax = Number.isFinite(maxJobs) ? Math.min(Math.max(maxJobs, 1), 200) : 25;
    const stats = await processEmailQueueBatch(safeMax);

    return NextResponse.json({
      success: true,
      queued: true,
      processed: stats.processed,
      sent: stats.sent,
      retried: stats.retried,
      failed: stats.failed,
    });
  } catch (error) {
    console.error("[EmailQueue] Processor failed", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "QUEUE_PROCESS_FAILED",
          message: "Email queue processor failed",
        },
      },
      { status: 500 }
    );
  }
}
