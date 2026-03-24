import { AdminSidebar } from "@/components/admin/AdminSidebar";

// ✅ Note: Authentication is enforced by middleware (src/middleware.ts)
// This layout is only rendered if the user has a valid admin session
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
