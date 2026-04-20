import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getEmailQueueHealth, processEmailQueueBatch, processSupportEmailQueueBatch } from "@/lib/email/queue";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const health = await getEmailQueueHealth();
  return NextResponse.json({ success: true, health });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const maxRaw = Number((body as { max?: unknown }).max ?? 25);
  const safeMax = Number.isFinite(maxRaw) ? Math.min(Math.max(maxRaw, 1), 200) : 25;
  const supportMaxRaw = Number((body as { supportMax?: unknown }).supportMax ?? safeMax);
  const safeSupportMax = Number.isFinite(supportMaxRaw) ? Math.min(Math.max(supportMaxRaw, 1), 200) : safeMax;

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

  const health = await getEmailQueueHealth();

  return NextResponse.json({
    success: true,
    processed: stats.processed,
    sent: stats.sent,
    retried: stats.retried,
    failed: stats.failed,
    queues: {
      transactional: transactionalStats,
      support: supportStats,
    },
    health,
  });
}
