// Cache website details for 60 seconds — admin changes are infrequent
export const revalidate = 60;

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { WebsiteForm } from "@/components/admin/WebsiteForm";

async function getData(id: string) {
  if (id === "new") {
    const [countries, categories, tags] = await Promise.all([
      db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);
    return { website: null, countries, categories, tags };
  }

  const [website, countries, categories, tags] = await Promise.all([
    db.website.findUnique({
      where: { id },
      include: { websiteTags: { select: { tagId: true } } },
    }),
    db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!website) notFound();
  return {
    website: {
      ...website,
      tagIds: website.websiteTags.map((t) => t.tagId),
    },
    countries,
    categories,
    tags,
  };
}

export default async function WebsiteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { website, countries, categories, tags } = await getData(id);

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-border-gray px-6 py-4">
        <h1 className="text-lg font-semibold text-navy">
          {website ? "Edit Website" : "Add Website"}
        </h1>
      </div>
      <div className="flex-1 p-6 max-w-2xl">
        <WebsiteForm
          website={website}
          countries={countries}
          categories={categories}
          tags={tags}
        />
      </div>
    </div>
  );
}
