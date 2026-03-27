// Cache leads for 60 seconds — admin list, changes are infrequent
export const revalidate = 60;
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { decryptField } from "@/lib/server-utils";
import { AppHeader } from "@/components/dashboard/AppHeader";

export default async function AdminLeadsPage() {
  const leads = await db.serviceLead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const decrypted = leads.map((l) => ({ ...l, phone: l.phone ? decryptField(l.phone) : null }));
  type LeadRow = (typeof decrypted)[number];

  const statusStyle: Record<string, string> = {
    new: "bg-[#EEF2FF] text-[#465FFF]",
    contacted: "bg-orange-50 text-orange-700",
    closed: "bg-green-50 text-green-700",
  };

  return (
    <>
      <AppHeader title={`Service Leads (${leads.length})`} />
      <div className="flex-1 p-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {decrypted.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-gray-400 text-sm">No leads yet.</td></tr>
                ) : decrypted.map((lead: LeadRow) => (
                  <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-400">{lead.email}</p>
                      {lead.phone && <p className="text-xs text-gray-400">{lead.phone}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{lead.serviceType ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle[lead.status] ?? "bg-gray-100 text-gray-600"}`}>{lead.status}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(lead.createdAt)}</td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-xs text-gray-500 truncate">{lead.message ?? "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
