import { PrismaClient } from "@prisma/client";

function intFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const POOL_MAX = intFromEnv("PRISMA_POOL_MAX", process.env.NODE_ENV === "production" ? 20 : 10);
const POOL_IDLE_TIMEOUT_MS = intFromEnv("PRISMA_POOL_IDLE_TIMEOUT_MS", 10_000);
const POOL_CONNECT_TIMEOUT_MS = intFromEnv("PRISMA_POOL_CONNECT_TIMEOUT_MS", 10_000);
const POOL_MAX_USES = intFromEnv("PRISMA_POOL_MAX_USES", 7_500);
const DB_QUERY_TIMEOUT_MS = intFromEnv("DB_QUERY_TIMEOUT_MS", 15_000);

function createAdapter() {
  const url = process.env.DATABASE_URL ?? "";
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");

  const pool = new Pool({
    connectionString: url,
    max: POOL_MAX,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
    statement_timeout: DB_QUERY_TIMEOUT_MS,
    maxUses: POOL_MAX_USES,
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

globalForPrisma.prisma = db;
