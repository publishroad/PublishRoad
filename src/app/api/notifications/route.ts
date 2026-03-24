import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const countOnly = url.searchParams.get("countOnly") === "true";

  const { notifications, unreadCount, count } = await getNotificationsForUser({
    userId,
    unreadOnly,
  });

  if (countOnly) {
    const response = NextResponse.json({ count });
    response.headers.set("Cache-Control", "private, max-age=30, s-maxage=0, must-revalidate");
    return response;
  }

  const response = NextResponse.json({ notifications, unreadCount });
  response.headers.set("Cache-Control", "private, max-age=30, s-maxage=0, must-revalidate");
  return response;
}
