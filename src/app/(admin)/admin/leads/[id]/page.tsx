export const revalidate = 0;

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/server-utils";
import {
  packageSlugFromServiceType,
  parseHireUsLeadNotes,
  resolveLeadDisplayNames,
  resolveHireUsChecklistFromCuration,
  type HireUsLeadState,
} from "@/lib/hire-us";
import { HireUsLeadEditor } from "@/components/admin/HireUsLeadEditor";
import { formatDate } from "@/lib/utils";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Hidden";
  if (local.length <= 2) return `${local[0] ?? "*"}*@${domain}`;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "Hidden";
  return `*** *** ${digits.slice(-4)}`;
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await db.serviceLead.findUnique({ where: { id } });
  if (!lead) notFound();

  const packageSlug = packageSlugFromServiceType(lead.serviceType);
  if (!packageSlug) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-border-gray p-6">
          <h1 className="text-lg font-semibold text-navy">Lead: {lead.name}</h1>
          <p className="text-sm text-medium-gray mt-2">
            This lead is not a Hire Us lead and does not support stage/checklist timeline management.
          </p>
        </div>
      </div>
    );
  }

  const notes = parseHireUsLeadNotes(lead.notes, packageSlug);

  const { checklist, linkedCurationId } = await resolveHireUsChecklistFromCuration({
    userId: lead.userId,
    email: lead.email,
    knownCurationId: notes.curationId,
    notesRaw: lead.notes,
    message: lead.message,
    existingChecklist: notes.checklist,
  });

  const displayNameMap = await resolveLeadDisplayNames([
    {
      linkedCurationId,
      websiteUrl: lead.websiteUrl,
    },
  ]);
  const websiteName = (linkedCurationId ? displayNameMap.get(linkedCurationId) : undefined) ?? lead.websiteUrl ?? null;

  const maskedEmail = maskEmail(lead.email);
  const maskedPhone = lead.phone ? maskPhone(decryptField(lead.phone)) : null;

  return (
    <div className="flex-1 p-6 max-w-4xl space-y-6">
      <div className="bg-white rounded-xl border border-border-gray p-6">
        <h1 className="text-lg font-semibold text-navy">Hire Us Lead: {lead.name}</h1>
        <p className="text-sm text-medium-gray mt-1">{maskedEmail}</p>
        {maskedPhone && <p className="text-sm text-medium-gray">{maskedPhone}</p>}
        {websiteName && (
          <p className="text-sm text-dark-gray mt-3">
            <span className="text-medium-gray">Website:</span> {websiteName}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-4 mt-5 text-sm">
          <div>
            <dt className="text-medium-gray">Package</dt>
            <dd className="font-medium text-dark-gray capitalize">{packageSlug}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Created</dt>
            <dd className="font-medium text-dark-gray">{formatDate(lead.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Linked Curation</dt>
            <dd className="font-medium text-dark-gray">{linkedCurationId ?? "Not linked yet"}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Execution State</dt>
            <dd className="font-medium text-dark-gray capitalize">{notes.state}</dd>
          </div>
        </dl>
      </div>

      <HireUsLeadEditor
        leadId={lead.id}
        initialStatus={lead.status as "new" | "contacted" | "closed"}
        initialMessage={lead.message ?? ""}
        initialState={notes.state as HireUsLeadState}
        initialChecklist={checklist.map((item) => ({
          id: item.id,
          label: item.label,
          stepKey: item.stepKey,
          stepLabel: item.stepLabel,
          completed: item.completed,
          completionNote: item.completionNote,
        }))}
        initialTimeline={notes.timeline}
      />
    </div>
  );
}
