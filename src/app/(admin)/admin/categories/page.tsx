// Always render fresh in admin so lookup changes reflect immediately.
export const revalidate = 0;

import { db } from "@/lib/db";
import { LookupManager } from "@/components/admin/LookupManager";
import { AppHeader } from "@/components/dashboard/AppHeader";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <AppHeader title="Categories" />
      <div className="flex-1 p-6 max-w-2xl">
        <p className="mb-4 text-sm text-gray-500">
          Live categories appear across the platform. Hidden categories are excluded from user-facing flows.
        </p>
        <LookupManager type="categories" items={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, isActive: c.isActive }))} />
      </div>
    </>
  );
}
