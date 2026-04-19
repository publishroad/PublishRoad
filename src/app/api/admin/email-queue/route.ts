import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getEmailQueueHealth, processEmailQueueBatch } from "@/lib/email/queue";

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

  const stats = await processEmailQueueBatch(safeMax);
  const health = await getEmailQueueHealth();

  return NextResponse.json({
    success: true,
    processed: stats.processed,
    sent: stats.sent,
    retried: stats.retried,
    failed: stats.failed,
    health,
  });
}
