export const revalidate = 60;

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { FundForm } from "@/components/admin/FundForm";

async function getData(id: string) {
  if (id === "new") {
    const [countries, categories, tags] = await Promise.all([
      db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);
    return { fund: null, countries, categories, tags };
  }

  const [fund, countries, categories, tags] = await Promise.all([
    db.fund.findUnique({
      where: { id },
      include: {
        fundTags: { select: { tagId: true } },
        fundCategories: { select: { categoryId: true } },
      },
    }),
    db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!fund) notFound();
  return {
    fund: {
      ...fund,
      tagIds: fund.fundTags.map((t) => t.tagId),
      categoryIds: fund.fundCategories.map((c) => c.categoryId),
    },
    countries,
    categories,
    tags,
  };
}

export default async function FundEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { fund, countries, categories, tags } = await getData(id);

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-border-gray px-6 py-4">
        <h1 className="text-lg font-semibold text-navy">
          {fund ? "Edit Fund" : "Add Fund"}
        </h1>
      </div>
      <div className="flex-1 p-6 max-w-2xl">
        <FundForm
          fund={fund}
          countries={countries}
          categories={categories}
          tags={tags}
        />
      </div>
    </div>
  );
}
