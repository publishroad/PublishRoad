import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createHireUsTimelineEvent,
  packageSlugFromServiceType,
  parseHireUsLeadNotes,
  serializeHireUsLeadNotes,
  syncChecklistCompletionToCurationResults,
} from "@/lib/hire-us";

const checklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  stepKey: z.string().trim().min(1).max(100).nullable().optional(),
  stepLabel: z.string().trim().min(1).max(200).nullable().optional(),
  completed: z.boolean(),
  completionNote: z.string().trim().max(300).nullable().optional(),
});

const updateSchema = z.object({
  status: z.enum(["new", "contacted", "closed"]).optional(),
  message: z.string().trim().min(1).max(5000).optional(),
  state: z.enum(["started", "working", "completed"]).optional(),
  checklist: z.array(checklistItemSchema).max(100).optional(),
  customUpdate: z.string().trim().max(2000).optional(),
});


export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 422 });
  }

  const lead = await db.serviceLead.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      serviceType: true,
      notes: true,
    },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const payload = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (payload.status) {
    updateData.status = payload.status;
  }
  if (payload.message) {
    updateData.message = payload.message;
  }

  const packageSlug = packageSlugFromServiceType(lead.serviceType);
  if (packageSlug) {
    const notes = parseHireUsLeadNotes(lead.notes, packageSlug);
    const now = new Date().toISOString();
    const adminLabel = `admin:${session.adminId}`;

    if (payload.state && payload.state !== notes.state) {
      notes.state = payload.state;
      notes.timeline = [
        ...notes.timeline,
        createHireUsTimelineEvent("state_change", `State updated to ${payload.state}.`, adminLabel, now),
      ].slice(-50);
      notes.lastAdminUpdateAt = now;
      notes.lastAdminUpdateBy = adminLabel;
    }

    if (payload.checklist) {
      const previousChecklist = notes.checklist;
      const before = JSON.stringify(
        notes.checklist.map((item) => ({
          id: item.id,
          completed: item.completed,
          completionNote: item.completionNote ?? null,
        }))
      );
      notes.checklist = payload.checklist.map((item) => {
        const existing = notes.checklist.find((current) => current.id === item.id);
        return {
          id: item.id,
          label: item.label,
          stepKey: item.stepKey ?? existing?.stepKey ?? null,
          stepLabel: item.stepLabel ?? existing?.stepLabel ?? null,
          completed: item.completed,
          completedAt: item.completed ? existing?.completedAt ?? now : null,
          completionNote:
            typeof item.completionNote === "string" && item.completionNote.trim().length > 0
              ? item.completionNote.trim()
              : null,
        };
      });
      const after = JSON.stringify(
        notes.checklist.map((item) => ({
          id: item.id,
          completed: item.completed,
          completionNote: item.completionNote ?? null,
        }))
      );
      if (before !== after) {
        notes.timeline = [
          ...notes.timeline,
          createHireUsTimelineEvent("checklist_update", "Checklist progress updated.", adminLabel, now),
        ].slice(-50);
        notes.lastAdminUpdateAt = now;
        notes.lastAdminUpdateBy = adminLabel;
      }

      await syncChecklistCompletionToCurationResults({
        linkedCurationId: notes.curationId,
        previousChecklist,
        nextChecklist: notes.checklist,
      });
    }

    if (payload.customUpdate) {
      notes.timeline = [
        ...notes.timeline,
        createHireUsTimelineEvent("admin_update", payload.customUpdate, adminLabel, now),
      ].slice(-50);
      notes.lastAdminUpdateAt = now;
      notes.lastAdminUpdateBy = adminLabel;
    }

    updateData.notes = serializeHireUsLeadNotes(notes);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true, unchanged: true });
  }

  await db.serviceLead.update({ where: { id }, data: updateData });
  return NextResponse.json({ success: true });
}
