import { config } from "dotenv";
config({ path: ".env.local" });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require("@prisma/adapter-pg");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const sites = await db.website.findMany({
    where: {
      name: { in: ["Product Hunt", "AlternativeTo", "Capterra", "G2", "There's An AI For That", "Futurepedia", "SaaSHub", "Betalist", "Peerlist"] },
    },
    select: {
      name: true,
      categoryId: true,
      category: { select: { name: true } },
      websiteCategories: { select: { category: { select: { name: true } } } },
    },
  });

  console.log("\nPrimary categoryId (FK) vs all assigned categories:\n");
  for (const s of sites) {
    const allCats = s.websiteCategories.map((wc: { category: { name: string } }) => wc.category.name).join(", ");
    console.log(`${s.name}`);
    console.log(`  Primary (FK):  ${s.category?.name ?? "(null)"}`);
    console.log(`  All categories: ${allCats || "(none)"}`);
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
