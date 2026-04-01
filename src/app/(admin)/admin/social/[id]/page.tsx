export const revalidate = 0;

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { InfluencerForm } from "@/components/admin/InfluencerForm";

async function getData(id: string) {
  if (id === "new") {
    const [countries, categories, tags] = await Promise.all([
      db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);
    return { influencer: null, countries, categories, tags };
  }

  const [influencer, countries, categories, tags] = await Promise.all([
    db.influencer.findUnique({
      where: { id },
      include: {
        influencerTags: { select: { tagId: true } },
        influencerCategories: { select: { categoryId: true } },
      },
    }),
    db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!influencer) notFound();
  return {
    influencer: {
      ...influencer,
      tagIds: influencer.influencerTags.map((t) => t.tagId),
      categoryIds: influencer.influencerCategories.map((c) => c.categoryId),
    },
    countries,
    categories,
    tags,
  };
}

export default async function InfluencerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { influencer, countries, categories, tags } = await getData(id);

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-border-gray px-6 py-4">
        <h1 className="text-lg font-semibold text-navy">
          {influencer ? "Edit Influencer" : "Add Influencer"}
        </h1>
      </div>
      <div className="flex-1 p-6 max-w-2xl">
        <InfluencerForm
          influencer={influencer}
          countries={countries}
          categories={categories}
          tags={tags}
        />
      </div>
    </div>
  );
}
