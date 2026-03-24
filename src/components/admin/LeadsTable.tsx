"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  websiteUrl: string | null;
  serviceType: string | null;
  message: string | null;
  status: string;
  createdAt: Date;
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? leads : leads.filter((l) => l.status === filter);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error("Failed to update"); return; }
    toast.success("Status updated");
    router.refresh();
  }

  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    closed: leads.filter((l) => l.status === "closed").length,
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "new", "contacted", "closed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              filter === status
                ? "bg-navy text-white"
                : "bg-white border border-border-gray text-medium-gray hover:border-navy hover:text-navy"
            }`}
          >
            {status} ({counts[status]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border-gray overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ice-blue border-b border-border-gray">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-navy">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Service</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Message</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Date</th>
              <th className="text-left px-4 py-3 font-medium text-navy">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-gray">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-medium-gray">
                  No leads found.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-ice-blue/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{lead.name}</p>
                    <a href={`mailto:${lead.email}`} className="text-xs text-blue hover:underline">
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <p className="text-xs text-medium-gray">{lead.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-medium-gray capitalize">
                    {lead.serviceType ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-medium-gray max-w-xs">
                    <p className="truncate">{lead.message ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-medium-gray text-xs">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="border border-border-gray rounded px-2 py-1 text-xs focus:outline-none focus:border-navy"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
