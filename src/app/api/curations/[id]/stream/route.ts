import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const POLL_INTERVAL_MS = 2000;
const DB_STATUS_CHECK_INTERVAL = 5;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // Ownership check
  const curation = await db.curation.findUnique({
    where: { id },
    select: { userId: true, status: true },
  });

  if (!curation) return new Response("Not found", { status: 404 });
  if (curation.userId !== userId) return new Response("Forbidden", { status: 403 });

  // If already completed or failed, return immediate terminal event
  if (curation.status === "completed" || curation.status === "failed") {
    const event = curation.status === "completed" ? "complete" : "error";
    const body = `data: ${JSON.stringify({ event })}\n\n`;
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Stream progress events from Redis pub/sub channel
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const channelKey = `curation:${id}:progress`;
      let isActive = true;
      let lastEvent = "";
      let iteration = 0;

      const poll = async () => {
        while (isActive) {
          try {
            iteration += 1;
            const event = await redis.get<string>(channelKey);
            if (event && event !== lastEvent) {
              lastEvent = event;
              const data = `data: ${JSON.stringify({ event })}\n\n`;
              controller.enqueue(encoder.encode(data));

              if (event === "complete" || event === "error") {
                isActive = false;
                controller.close();
                return;
              }
            }

            if (iteration % DB_STATUS_CHECK_INTERVAL === 0) {
              const current = await db.curation.findUnique({
                where: { id },
                select: { status: true },
              });

              if (current?.status === "completed") {
                const data = `data: ${JSON.stringify({ event: "complete" })}\n\n`;
                controller.enqueue(encoder.encode(data));
                isActive = false;
                controller.close();
                return;
              }

              if (current?.status === "failed") {
                const data = `data: ${JSON.stringify({ event: "error" })}\n\n`;
                controller.enqueue(encoder.encode(data));
                isActive = false;
                controller.close();
                return;
              }
            }
          } catch {
            // Ignore errors in polling
          }

          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
      };

      poll();

      // Close after 5 minutes maximum
      setTimeout(() => {
        isActive = false;
        try { controller.close(); } catch { /* already closed */ }
      }, 5 * 60 * 1000);
    },
    cancel() {
      // No-op — cleanup happens in poll loop
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
