"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";

type AdminNotification = {
  id: string;
  type: "hire_us" | "payment_success";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  isRead: boolean;
};

async function fetchAdminNotifications(): Promise<{ notifications: AdminNotification[]; unreadCount: number }> {
  const res = await fetch("/api/admin/notifications", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch admin notifications");
  return res.json();
}

const typeStyles: Record<AdminNotification["type"], { icon: string; bg: string; color: string }> = {
  hire_us: { icon: "🤝", bg: "bg-amber-100", color: "text-amber-700" },
  payment_success: { icon: "💸", bg: "bg-emerald-100", color: "text-emerald-700" },
};

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: fetchAdminNotifications,
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Failed to mark notification as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (!res.ok) throw new Error("Failed to mark all notifications as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <>
      <AppHeader
        title="Notifications"
        rightSlot={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Mark all as read
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {unreadCount > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 flex gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">No admin notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const style = typeStyles[notification.type];
                return (
                  <div
                    key={notification.id}
                    className={`p-4 flex gap-3 transition-colors ${
                      !notification.isRead ? "bg-blue-50/40" : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${style.bg} ${style.color}`}
                    >
                      {style.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`font-medium text-sm ${
                            !notification.isRead ? "text-gray-900" : "text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatRelativeTime(new Date(notification.createdAt))}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>

                      <div className="mt-2 flex items-center gap-4">
                        <Link
                          href={notification.href}
                          className="text-xs text-[#465FFF] hover:underline"
                        >
                          Open
                        </Link>
                        {!notification.isRead && (
                          <button
                            type="button"
                            onClick={() => markOne.mutate(notification.id)}
                            disabled={markOne.isPending}
                            className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-60"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
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
