"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationHeaderAction } from "@/components/dashboard/NotificationHeaderAction";

export function TopBar({ title }: { title?: string }) {
  const { data: session } = useSession();

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
        <NotificationHeaderAction href="/dashboard/notifications" />

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
