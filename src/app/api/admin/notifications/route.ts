import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import {
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "@/lib/admin/notifications";

const markReadSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    markAll: z.boolean().optional(),
  })
  .refine((value) => value.markAll === true || Boolean(value.id), {
    message: "Provide id or markAll=true",
  });


function getRequestIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  const [firstIp] = forwardedFor.split(",");
  return firstIp?.trim() || null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await listAdminNotifications({ adminId: session.adminId, limit: 120 });
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }

  const ip = getRequestIp(req);

  if (parsed.data.markAll) {
    const updated = await markAllAdminNotificationsRead({
      adminId: session.adminId,
      ip,
      limit: 120,
    });

    return NextResponse.json({ success: true, updated });
  }

  const eventId = parsed.data.id!;
  await markAdminNotificationRead({
    adminId: session.adminId,
    eventId,
    ip,
  });

  return NextResponse.json({ success: true, updated: 1 });
}
