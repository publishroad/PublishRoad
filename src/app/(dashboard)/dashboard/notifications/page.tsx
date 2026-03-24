"use client";
// Client component — no server-side dynamic rendering needed

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const data = await res.json();
  return data.notifications;
}

const typeIcons: Record<string, { icon: string; bg: string; color: string }> = {
  curation_complete: { icon: "✓", bg: "bg-green-100", color: "text-green-700" },
  low_credits: { icon: "⚡", bg: "bg-orange-100", color: "text-orange-600" },
  payment_success: { icon: "$", bg: "bg-blue-100", color: "text-blue-600" },
  system: { icon: "ℹ", bg: "bg-gray-100", color: "text-gray-600" },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <>
      <AppHeader
        title="Notifications"
        rightSlot={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Mark all as read
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {unreadCount > 0 && (
          <p className="text-sm text-gray-500 mb-4">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const style = typeIcons[notification.type] ?? typeIcons.system;
                return (
                  <div
                    key={notification.id}
                    className={`p-4 flex gap-3 transition-colors ${
                      !notification.isRead ? "bg-blue-50/40" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${style.bg} ${style.color}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatRelativeTime(new Date(notification.createdAt))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => markRead.mutate(notification.id)}
                        className="text-xs text-[#465FFF] hover:underline shrink-0 self-start mt-0.5"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
