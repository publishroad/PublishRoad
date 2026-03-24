import { db } from "@/lib/db";
import { getCachedWithLock, CacheTTL } from "@/lib/cache";

interface GetNotificationsOptions {
  userId: string;
  unreadOnly?: boolean;
}

export async function getNotificationsForUser({
  userId,
  unreadOnly = false,
}: GetNotificationsOptions) {
  const cacheKey = `user:${userId}:notifications:list`;

  const cached = await getCachedWithLock(cacheKey, CacheTTL.NOTIFICATIONS, async () => {
    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  });

  const notifications = cached.notifications;
  const filtered = unreadOnly ? notifications.filter((n) => !n.isRead) : notifications;

  return {
    notifications: filtered,
    unreadCount: cached.unreadCount,
    count: filtered.length,
  };
}

export function getNotificationsCacheKey(userId: string) {
  return `user:${userId}:notifications:list`;
}
