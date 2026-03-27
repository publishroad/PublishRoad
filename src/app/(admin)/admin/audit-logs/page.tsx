// Cache audit logs for 60 seconds — immutable historical data
export const revalidate = 60;
import { db } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";

interface SearchParams { page?: string; }
const PAGE_SIZE = 50;

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const skip = (page - 1) * PAGE_SIZE;
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip, take: PAGE_SIZE }),
    db.auditLog.count(),
  ]);
  type AuditLogRow = (typeof logs)[number];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <AppHeader title={`Audit Logs (${total.toLocaleString()})`} />
      <div className="flex-1 p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: AuditLogRow) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4"><span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{log.action}</span></td>
                    <td className="px-5 py-4 text-sm text-gray-600 capitalize">{log.entity}{log.entityId && <span className="text-xs ml-1 font-mono text-gray-400">{log.entityId.slice(0, 8)}…</span>}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-400">{log.adminId?.slice(0, 8) ?? "—"}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-400">{log.ip ?? "—"}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/admin/audit-logs?page=${page - 1}`} className="h-9 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 flex items-center transition-colors">Previous</Link>}
              {page < totalPages && <Link href={`/admin/audit-logs?page=${page + 1}`} className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium flex items-center transition-colors">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
