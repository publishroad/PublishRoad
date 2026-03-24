// Cache lookup table for 300 seconds — rarely changes
export const revalidate = 300;

import { db } from "@/lib/db";
import { LookupManager } from "@/components/admin/LookupManager";
import { AppHeader } from "@/components/dashboard/AppHeader";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <AppHeader title="Categories" />
      <div className="flex-1 p-6 max-w-2xl">
        <LookupManager type="categories" items={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, isActive: c.isActive }))} />
      </div>
    </>
  );
}
