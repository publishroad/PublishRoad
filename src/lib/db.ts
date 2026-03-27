import { PrismaClient } from "@prisma/client";

function createAdapter() {
  const url = process.env.DATABASE_URL ?? "";
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
  // Cast to PrismaClient so $transaction callbacks stay typed as Prisma.TransactionClient
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
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
