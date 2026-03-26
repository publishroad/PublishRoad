import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

type RelationLookup = {
  tagIds: string[];
  categoryIds: string[];
};

export async function resolveTagAndCategorySlugs({ tagIds, categoryIds }: RelationLookup) {
  const [tags, categories] = await Promise.all([
    tagIds.length > 0
      ? db.tag.findMany({ where: { id: { in: tagIds } }, select: { slug: true } })
      : Promise.resolve([]),
    categoryIds.length > 0
      ? db.category.findMany({ where: { id: { in: categoryIds } }, select: { slug: true } })
      : Promise.resolve([]),
  ]);

  return {
    tagSlugs: tags.map((t) => t.slug),
    categorySlugs: categories.map((c) => c.slug),
  };
}

type CreateWithRelationsArgs<T> = {
  tagIds: string[];
  categoryIds: string[];
  createEntity: (tx: Prisma.TransactionClient) => Promise<T>;
  createTagRelations: (tx: Prisma.TransactionClient, entity: T, tagIds: string[]) => Promise<unknown>;
  createCategoryRelations: (tx: Prisma.TransactionClient, entity: T, categoryIds: string[]) => Promise<unknown>;
};

export async function createEntityWithRelations<T>({
  tagIds,
  categoryIds,
  createEntity,
  createTagRelations,
  createCategoryRelations,
}: CreateWithRelationsArgs<T>) {
  return db.$transaction(async (tx) => {
    const entity = await createEntity(tx);

    await Promise.all([
      tagIds.length > 0 ? createTagRelations(tx, entity, tagIds) : Promise.resolve(),
      categoryIds.length > 0 ? createCategoryRelations(tx, entity, categoryIds) : Promise.resolve(),
    ]);

    return entity;
  });
}
