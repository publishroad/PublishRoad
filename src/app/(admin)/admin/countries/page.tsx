// Always render fresh in admin so lookup changes reflect immediately.
export const revalidate = 0;

import { db } from "@/lib/db";
import { LookupManager } from "@/components/admin/LookupManager";
import { AppHeader } from "@/components/dashboard/AppHeader";

export default async function AdminCountriesPage() {
  const countries = await db.country.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <AppHeader title="Countries" />
      <div className="flex-1 p-6 max-w-2xl">
        <LookupManager type="countries" items={countries.map((c) => ({ id: c.id, name: c.name, slug: c.slug, isActive: c.isActive, extra: c.flagEmoji ?? undefined }))} extraLabel="Flag Emoji" />
      </div>
    </>
  );
}
