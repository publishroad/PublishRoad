// Cache website details for 60 seconds — admin changes are infrequent
export const revalidate = 0;

import { db } from "@/lib/db";
import { isMissingRelationError } from "@/lib/db-error-utils";
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

  const countriesPromise = db.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  const categoriesPromise = db.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  const tagsPromise = db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  let website:
    | {
        id: string;
        name: string;
        url: string;
        type: string;
        da: number;
        pa: number;
        spamScore: number;
        traffic: number;
        description: string | null;
        countryId: string | null;
        isActive: boolean;
        isPinned: boolean;
        isExcluded: boolean;
        tagIds: string[];
        categoryIds: string[];
        countryIds: string[];
      }
    | null = null;

  try {
    const loadedWebsite = await db.website.findUnique({
      where: { id },
      include: {
        websiteTags: { select: { tagId: true } },
        websiteCategories: { select: { categoryId: true } },
        websiteCountries: { select: { countryId: true } },
      },
    });

    if (!loadedWebsite) {
      website = null;
    } else {
      website = {
        ...loadedWebsite,
        tagIds: loadedWebsite.websiteTags.map((t) => t.tagId),
        categoryIds: loadedWebsite.websiteCategories.map((c) => c.categoryId),
        countryIds: loadedWebsite.websiteCountries.map((c) => c.countryId),
      };
    }
  } catch (error) {
    if (!isMissingRelationError(error, "website_countries")) {
      throw error;
    }

    const loadedWebsite = await db.website.findUnique({
      where: { id },
      include: {
        websiteTags: { select: { tagId: true } },
        websiteCategories: { select: { categoryId: true } },
      },
    });

    if (!loadedWebsite) {
      website = null;
    } else {
      website = {
        ...loadedWebsite,
        tagIds: loadedWebsite.websiteTags.map((t) => t.tagId),
        categoryIds: loadedWebsite.websiteCategories.map((c) => c.categoryId),
        countryIds: loadedWebsite.countryId ? [loadedWebsite.countryId] : [],
      };
    }
  }

  const [countries, categories, tags] = await Promise.all([
    countriesPromise,
    categoriesPromise,
    tagsPromise,
  ]);

  if (!website) notFound();
  return {
    website,
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
