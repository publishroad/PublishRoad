import { defineConfig } from "prisma/config";
import { config } from "dotenv";
// Load .env.local first (Next.js convention), then fall back to .env
config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Prisma v7 configuration.
 *
 * DATABASE_URL  — pooled connection (PgBouncer) for runtime queries (used in db.ts via PrismaNeon adapter)
 * DIRECT_URL    — direct connection for migrations (bypasses PgBouncer)
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    async adapter(env) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require("pg");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaPg } = require("@prisma/adapter-pg");
      const pool = new Pool({
        connectionString: env.DIRECT_URL ?? env.DATABASE_URL ?? "",
        max: 2,
      });
      return new PrismaPg(pool);
    },
  },
});
