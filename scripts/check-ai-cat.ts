import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require("@prisma/adapter-pg");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
  });

  const aiCat = categories.find(
    (c) => c.slug === "al-tools-agents"
  );

  if (!aiCat) {
    console.log("No AI category found. All categories:", categories.map((c) => `${c.name} (${c.slug})`));
    return;
  }

  console.log("Found category:", aiCat);

  const counts = await db.website.groupBy({
    by: ["type"],
    where: { isActive: true, isExcluded: false, categoryId: aiCat.id },
    _count: true,
  });

  console.log(`\nWebsite counts by type in "${aiCat.name}":`);
  for (const row of counts) {
    console.log(`  ${row.type}: ${row._count}`);
  }

  const total = await db.website.count({
    where: { isActive: true, isExcluded: false, categoryId: aiCat.id },
  });
  console.log(`  TOTAL: ${total}`);

  // Also check starred
  const starred = await db.website.groupBy({
    by: ["type"],
    where: { isActive: true, isExcluded: false, categoryId: aiCat.id, starRating: { gte: 3 } },
    _count: true,
  });
  console.log(`\nStarred (>=3★) by type in "${aiCat.name}":`);
  for (const row of starred) {
    console.log(`  ${row.type}: ${row._count}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
