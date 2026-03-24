import { PrismaClient } from "@prisma/client";

function createAdapter() {
  const url = process.env.DATABASE_URL ?? "";
  // Use standard pg driver for local PostgreSQL (127.0.0.1 / localhost)
  const isLocal = url.includes("127.0.0.1") || url.includes("localhost");

  if (isLocal) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    return new PrismaPg(pool);
  }

  // Use Neon serverless adapter for Supabase cloud / Neon
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaNeon } = require("@prisma/adapter-neon");
  return new PrismaNeon({ connectionString: url });
}

function createPrismaClient() {
  const adapter = createAdapter();

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  // Prisma v7: use $extends for soft-delete middleware (replaces $use)
  return client.$extends({
    query: {
      user: {
        async findMany({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
      },
    },
  }) as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
