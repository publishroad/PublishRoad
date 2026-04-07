import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

const ADMIN_NOTIFICATION_ENTITY = "admin_notification";
const ADMIN_NOTIFICATION_READ_ACTION = "admin_notification_read";

type NotificationSeed = {
  id: string;
  type: "hire_us" | "payment_success";
  title: string;
  message: string;
  href: string;
  createdAt: Date;
};

export type AdminNotificationItem = {
  id: string;
  type: "hire_us" | "payment_success";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  isRead: boolean;
};

function hireUsPackageLabel(serviceType: string | null): string {
  if (serviceType === "hire_us_complete") return "Complete";
  if (serviceType === "hire_us_starter") return "Starter";
  return "Hire Us";
}

function notificationFromLead(lead: {
  id: string;
  name: string;
  email: string;
  serviceType: string | null;
  websiteUrl: string | null;
  createdAt: Date;
}): NotificationSeed {
  const packageLabel = hireUsPackageLabel(lead.serviceType);
  const websiteDetail = lead.websiteUrl ? ` for ${lead.websiteUrl}` : "";

  return {
    id: `lead:${lead.id}`,
    type: "hire_us",
    title: `New Hire Us (${packageLabel}) request`,
    message: `${lead.name} (${lead.email}) submitted a request${websiteDetail}.`,
    href: `/admin/leads/${lead.id}`,
    createdAt: lead.createdAt,
  };
}

function notificationFromPayment(payment: {
  id: string;
  paymentType: "plan" | "hire_us";
  amountCents: number;
  currency: string;
  userId: string;
  createdAt: Date;
}): NotificationSeed {
  const paymentLabel = payment.paymentType === "hire_us" ? "Hire Us" : "Plan";

  return {
    id: `payment:${payment.id}`,
    type: "payment_success",
    title: `${paymentLabel} payment completed`,
    message: `${formatCurrency(payment.amountCents, payment.currency.toUpperCase())} payment completed for user ${payment.userId.slice(0, 8)}...`,
    href: payment.paymentType === "hire_us" ? "/admin/leads" : "/admin/financials",
    createdAt: payment.createdAt,
  };
}

export async function listAdminNotifications(args: {
  adminId: string;
  limit?: number;
}): Promise<AdminNotificationItem[]> {
  const limit = args.limit ?? 100;

  const [leads, payments] = await Promise.all([
    db.serviceLead.findMany({
      where: {
        serviceType: {
          in: ["hire_us_starter", "hire_us_complete"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        serviceType: true,
        websiteUrl: true,
        createdAt: true,
      },
    }),
    db.payment.findMany({
      where: { status: "completed" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        paymentType: true,
        amountCents: true,
        currency: true,
        userId: true,
        createdAt: true,
      },
    }),
  ]);

  const seeds = [
    ...leads.map(notificationFromLead),
    ...payments.map(notificationFromPayment),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  if (seeds.length === 0) {
    return [];
  }

  const readLogs = await db.auditLog.findMany({
    where: {
      adminId: args.adminId,
      action: ADMIN_NOTIFICATION_READ_ACTION,
      entity: ADMIN_NOTIFICATION_ENTITY,
      entityId: { in: seeds.map((seed) => seed.id) },
    },
    select: { entityId: true },
  });

  const readIds = new Set(readLogs.map((log) => log.entityId));

  return seeds.map((seed) => ({
    id: seed.id,
    type: seed.type,
    title: seed.title,
    message: seed.message,
    href: seed.href,
    createdAt: seed.createdAt.toISOString(),
    isRead: readIds.has(seed.id),
  }));
}

export async function markAdminNotificationRead(args: {
  adminId: string;
  eventId: string;
  ip?: string | null;
}): Promise<void> {
  const existing = await db.auditLog.findFirst({
    where: {
      adminId: args.adminId,
      action: ADMIN_NOTIFICATION_READ_ACTION,
      entity: ADMIN_NOTIFICATION_ENTITY,
      entityId: args.eventId,
    },
    select: { id: true },
  });

  if (existing) return;

  await db.auditLog.create({
    data: {
      adminId: args.adminId,
      action: ADMIN_NOTIFICATION_READ_ACTION,
      entity: ADMIN_NOTIFICATION_ENTITY,
      entityId: args.eventId,
      ip: args.ip ?? null,
    },
  });
}

export async function markAllAdminNotificationsRead(args: {
  adminId: string;
  ip?: string | null;
  limit?: number;
}): Promise<number> {
  const notifications = await listAdminNotifications({
    adminId: args.adminId,
    limit: args.limit,
  });

  const unreadIds = notifications
    .filter((item) => !item.isRead)
    .map((item) => item.id);

  if (unreadIds.length === 0) {
    return 0;
  }

  await db.auditLog.createMany({
    data: unreadIds.map((eventId) => ({
      adminId: args.adminId,
      action: ADMIN_NOTIFICATION_READ_ACTION,
      entity: ADMIN_NOTIFICATION_ENTITY,
      entityId: eventId,
      ip: args.ip ?? null,
    })),
  });

  return unreadIds.length;
}
