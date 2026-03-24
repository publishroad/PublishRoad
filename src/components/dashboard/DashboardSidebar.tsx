"use client";

import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { AppSidebar } from "@/components/dashboard/AppSidebar";

const groups = [
  {
    title: "Menu",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/new-curation",
        label: "New Curation",
        icon: (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
      {
        href: "/dashboard/curations",
        label: "My Curations",
        icon: (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        href: "/dashboard/billing",
        label: "Billing",
        icon: (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/profile",
        label: "Profile",
        icon: (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
    ],
  },
];

interface DashboardSidebarProps {
  session: any; // Session type from next-auth
}

function UserBottomSlot({ session }: { session: any | null }) {
  const credits = session?.user?.creditsRemaining ?? 0;
  const initials = session?.user?.name?.[0]?.toUpperCase() ?? "U";
  const plan = session?.user?.planSlug?.toUpperCase() ?? "FREE";

  return (
    <div className="space-y-3">
      {/* Credits pill */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF2FF]">
        <span className="text-xs font-medium text-[#465FFF]">Credits</span>
        <span className="text-sm font-bold text-[#465FFF]">{credits === -1 ? "∞" : credits}</span>
      </div>
      {/* User row */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-[#465FFF] flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name ?? "User"}</p>
          <p className="text-xs text-gray-400">{plan}</p>
        </div>
      </div>
      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign Out
      </button>
    </div>
  );
}

export function DashboardSidebar({ session }: DashboardSidebarProps) {
  return (
    <AppSidebar
      groups={groups}
      exactMatch={["/dashboard"]}
      bottomSlot={<UserBottomSlot session={session} />}
    />
  );
}
