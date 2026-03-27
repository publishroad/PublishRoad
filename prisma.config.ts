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
  earlyAccess: true,
  schema: "prisma/schema.prisma",
});
