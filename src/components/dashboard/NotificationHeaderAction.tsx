"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

interface NotificationHeaderActionProps {
  href: string;
}

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications?unreadOnly=true&countOnly=true", {
    cache: "no-store",
  });

  if (!res.ok) {
    return 0;
  }

  const data = await res.json().catch(() => null);
  return data?.count ?? 0;
}

export function NotificationHeaderAction({ href }: NotificationHeaderActionProps) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <Link
      href={href}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-50 transition-colors"
      aria-label="Notifications"
    >
      <svg
        className="h-5 w-5 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
