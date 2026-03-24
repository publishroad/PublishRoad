"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications?unreadOnly=true&countOnly=true", {
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export function TopBar({ title }: { title?: string }) {
  const { data: session } = useSession();
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <header className="h-16 bg-white flex items-center px-6 gap-4" style={{ borderBottom: "1px solid rgba(226,232,240,0.8)" }}>
      {/* Page title */}
      <div className="flex-1">
        {title && (
          <h1
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
          >
            {title}
          </h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <Link
          href="/dashboard/notifications"
          className="relative p-2 rounded-full hover:bg-slate-50 transition-colors"
        >
          <svg
            className="w-5 h-5 text-slate-400"
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
            <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <Link href="/dashboard/profile">
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="text-white text-sm font-medium" style={{ backgroundColor: "var(--indigo)" }}>
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
