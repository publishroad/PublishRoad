"use client";

interface AppHeaderProps {
  title: string;
  rightSlot?: React.ReactNode;
}

export function AppHeader({ title, rightSlot }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-[70px] bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
    </header>
  );
}

// Reusable stat card
export function StatCard({
  label,
  value,
  sub,
  icon,
  iconBg = "bg-[#EEF2FF]",
  iconColor = "text-[#465FFF]",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-start gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <span className={cn("w-5 h-5", iconColor)}>{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// Badge component
export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "purple" | "blue";
}) {
  const styles: Record<string, string> = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-green-50 text-green-700",
    warning: "bg-orange-50 text-orange-700",
    error: "bg-red-50 text-red-700",
    purple: "bg-purple-50 text-purple-700",
    blue: "bg-[#EEF2FF] text-[#465FFF]",
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", styles[variant])}>
      {children}
    </span>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
