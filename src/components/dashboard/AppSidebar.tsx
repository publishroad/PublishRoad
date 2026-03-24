"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

interface AppSidebarProps {
  groups: NavGroup[];
  bottomSlot?: React.ReactNode;
  exactMatch?: string[]; // hrefs that need exact pathname match
}

export function AppSidebar({ groups, bottomSlot, exactMatch = [] }: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (exactMatch.includes(href)) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[260px] shrink-0 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-[70px] flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-gray-900">
          Publish<span className="text-[#465FFF]">Road</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-[#EEF2FF] text-[#465FFF]"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <span className={cn("shrink-0", active ? "text-[#465FFF]" : "text-gray-400")}>
                        {item.icon}
                      </span>
                      {item.label}
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#465FFF]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom slot (user info / logout) */}
      {bottomSlot && (
        <div className="border-t border-gray-200 px-4 py-4">
          {bottomSlot}
        </div>
      )}
    </aside>
  );
}
