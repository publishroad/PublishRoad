// Always render fresh in admin so lookup changes reflect immediately.
export const revalidate = 0;

import { db } from "@/lib/db";
import { LookupManager } from "@/components/admin/LookupManager";
import { AppHeader } from "@/components/dashboard/AppHeader";

export default async function AdminTagsPage() {
  const tags = await db.tag.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <AppHeader title="Tags" />
      <div className="flex-1 p-6 max-w-2xl">
        <LookupManager type="tags" items={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, isActive: t.isActive }))} />
      </div>
    </>
  );
}
