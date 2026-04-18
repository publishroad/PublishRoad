import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { invalidateUserProfile } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const POLL_INTERVAL_MS = 2000;
const DB_STATUS_CHECK_INTERVAL = 5;
const INITIAL_LOOKUP_RETRIES = 8;
const INITIAL_LOOKUP_DELAY_MS = 450;
const STALE_PENDING_TIMEOUT_MS = 8 * 60 * 1000;
const STALE_PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

function fallbackProgressEventForStatus(status: "pending" | "processing" | "completed" | "failed") {
  if (status === "processing") return "fetching_sites";
  if (status === "pending") return "started";
  if (status === "completed") return "complete";
  return "error";
}

async function lookupCurationWithRetry(id: string) {
  for (let attempt = 1; attempt <= INITIAL_LOOKUP_RETRIES; attempt += 1) {
    const curation = await db.curation.findUnique({
      where: { id },
      select: { userId: true, status: true, updatedAt: true },
    });

    if (curation) {
      return curation;
    }

    if (attempt < INITIAL_LOOKUP_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, INITIAL_LOOKUP_DELAY_MS));
    }
  }

  return null;
}

async function markStaleCurationAsFailed(id: string, userId: string) {
  const markedFailed = await db.curation.updateMany({
    where: {
      id,
      status: { in: ["pending", "processing"] },
    },
    data: {
      status: "failed",
      errorMessage: "Curation timed out while processing. Please retry.",
    },
  }).catch(() => ({ count: 0 }));

  if (markedFailed.count === 0) {
    return false;
  }

  await db.user.update({
    where: { id: userId },
    data: { creditsRemaining: { increment: 1 } },
  }).catch(() => {});

  await invalidateUserProfile(userId).catch(() => {});
  return true;
}

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
  const curation = await lookupCurationWithRetry(id);

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

      const initialEvent = fallbackProgressEventForStatus(curation.status);
      const initialData = `data: ${JSON.stringify({ event: initialEvent })}\n\n`;
      controller.enqueue(encoder.encode(initialData));
      lastEvent = initialEvent;

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
                select: { status: true, updatedAt: true },
              });

              if (current?.status === "pending" || current?.status === "processing") {
                const staleThreshold =
                  current.status === "pending" ? STALE_PENDING_TIMEOUT_MS : STALE_PROCESSING_TIMEOUT_MS;
                const isStale = Date.now() - new Date(current.updatedAt).getTime() > staleThreshold;

                if (isStale) {
                  const timedOut = await markStaleCurationAsFailed(id, userId);
                  if (timedOut) {
                    const data = `data: ${JSON.stringify({ event: "error" })}\n\n`;
                    controller.enqueue(encoder.encode(data));
                    isActive = false;
                    controller.close();
                    return;
                  }
                }
              }

              if (current?.status === "pending" || current?.status === "processing") {
                const fallbackEvent = fallbackProgressEventForStatus(current.status);
                if (fallbackEvent !== lastEvent) {
                  lastEvent = fallbackEvent;
                  const data = `data: ${JSON.stringify({ event: fallbackEvent })}\n\n`;
                  controller.enqueue(encoder.encode(data));
                }
              }

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
