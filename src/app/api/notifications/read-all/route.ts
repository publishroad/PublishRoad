import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { getNotificationsCacheKey } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  await redis.del(getNotificationsCacheKey(userId));

  return NextResponse.json({ success: true });
}
