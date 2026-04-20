import { NextRequest, NextResponse } from "next/server";
import { processEmailQueueBatch, processSupportEmailQueueBatch } from "@/lib/email/queue";
import {
  isInternalQueueRequestAllowed,
  isQueueAuthorizationValid,
  isTrustedVercelCronRequest,
} from "@/lib/internal-endpoint-security";

export async function POST(request: NextRequest) {
  if (!isQueueAuthorizationValid(request)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  if (!isTrustedVercelCronRequest(request) && !isInternalQueueRequestAllowed(request)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  try {
    const maxJobs = Number(request.nextUrl.searchParams.get("max") ?? process.env.EMAIL_QUEUE_BATCH_SIZE ?? 25);
    const safeMax = Number.isFinite(maxJobs) ? Math.min(Math.max(maxJobs, 1), 200) : 25;
    const supportMaxJobs = Number(
      request.nextUrl.searchParams.get("supportMax") ?? process.env.EMAIL_QUEUE_SUPPORT_BATCH_SIZE ?? safeMax
    );
    const safeSupportMax = Number.isFinite(supportMaxJobs) ? Math.min(Math.max(supportMaxJobs, 1), 200) : safeMax;

    const [transactionalStats, supportStats] = await Promise.all([
      processEmailQueueBatch(safeMax),
      processSupportEmailQueueBatch(safeSupportMax),
    ]);

    const stats = {
      processed: transactionalStats.processed + supportStats.processed,
      sent: transactionalStats.sent + supportStats.sent,
      retried: transactionalStats.retried + supportStats.retried,
      failed: transactionalStats.failed + supportStats.failed,
    };

    return NextResponse.json({
      success: true,
      queued: true,
      processed: stats.processed,
      sent: stats.sent,
      retried: stats.retried,
      failed: stats.failed,
      queues: {
        transactional: transactionalStats,
        support: supportStats,
      },
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

export async function GET(request: NextRequest) {
  return POST(request);
}
