import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

type FinancialsQueryInput = {
  page: number;
  limit: number;
  typeParam: string;
  statusParam: string;
  providerParam: string;
  chartGrouping: "month" | "year";
  search: string;
  fromParam: string | null;
  toParam: string | null;
};

const SCHEMA_CHECK_TTL_MS = 5 * 60 * 1000;
const paymentsColumnCache = new Map<string, { value: boolean; checkedAt: number }>();

async function hasPaymentsColumn(columnName: string): Promise<boolean> {
  const now = Date.now();
  const cached = paymentsColumnCache.get(columnName);
  if (cached && now - cached.checkedAt < SCHEMA_CHECK_TTL_MS) {
    return cached.value;
  }

  const rows = await db.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = ${columnName}
    ) AS exists
  `);

  const exists = !!rows[0]?.exists;
  paymentsColumnCache.set(columnName, { value: exists, checkedAt: now });
  return exists;
}

async function hasPaymentTypeColumn(): Promise<boolean> {
  return hasPaymentsColumn("payment_type");
}

async function resolveProviderPaymentIdExpr(): Promise<Prisma.Sql> {
  if (await hasPaymentsColumn("provider_payment_id")) {
    return Prisma.sql`p.provider_payment_id`;
  }

  if (await hasPaymentsColumn("providerPaymentId")) {
    return Prisma.sql`p."providerPaymentId"`;
  }

  return Prisma.sql`NULL::text`;
}

function inferProvider(payment: {
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  providerPaymentId: string | null;
}): string {
  if (payment.stripePaymentIntentId || payment.stripeSubscriptionId) return "Stripe";
  if (payment.providerPaymentId) {
    if (payment.providerPaymentId.startsWith("pay_") || payment.providerPaymentId.startsWith("order_")) {
      return "Razorpay";
    }
    return "PayPal";
  }
  return "Legacy / Other";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function buildWhereSql(
  input: FinancialsQueryInput,
  paymentTypeExpr: Prisma.Sql,
  providerPaymentIdExpr: Prisma.Sql,
): Prisma.Sql {
  const whereParts: Prisma.Sql[] = [];

  if (input.typeParam === "plan" || input.typeParam === "hire_us") {
    whereParts.push(Prisma.sql`${paymentTypeExpr} = ${input.typeParam}`);
  }

  if (input.statusParam !== "all") {
    whereParts.push(Prisma.sql`p.status::text = ${input.statusParam}`);
  }

  if (input.fromParam) {
    const fromDate = new Date(input.fromParam);
    if (!Number.isNaN(fromDate.valueOf())) whereParts.push(Prisma.sql`p.created_at >= ${fromDate}`);
  }

  if (input.toParam) {
    const toDate = new Date(input.toParam);
    toDate.setHours(23, 59, 59, 999);
    if (!Number.isNaN(toDate.valueOf())) whereParts.push(Prisma.sql`p.created_at <= ${toDate}`);
  }

  if (input.providerParam === "stripe") {
    whereParts.push(Prisma.sql`(p.stripe_payment_intent_id IS NOT NULL OR p.stripe_subscription_id IS NOT NULL)`);
  } else if (input.providerParam === "razorpay") {
    whereParts.push(Prisma.sql`
      (
        p.stripe_payment_intent_id IS NULL
        AND p.stripe_subscription_id IS NULL
        AND ${providerPaymentIdExpr} IS NOT NULL
        AND (${providerPaymentIdExpr} LIKE 'pay_%' OR ${providerPaymentIdExpr} LIKE 'order_%')
      )
    `);
  } else if (input.providerParam === "paypal") {
    whereParts.push(Prisma.sql`
      (
        p.stripe_payment_intent_id IS NULL
        AND p.stripe_subscription_id IS NULL
        AND ${providerPaymentIdExpr} IS NOT NULL
        AND ${providerPaymentIdExpr} NOT LIKE 'pay_%'
        AND ${providerPaymentIdExpr} NOT LIKE 'order_%'
      )
    `);
  }

  if (input.search) {
    const like = `%${input.search}%`;
    whereParts.push(Prisma.sql`(LOWER(u.email) LIKE ${like} OR LOWER(COALESCE(u.name, '')) LIKE ${like})`);
  }

  return whereParts.length
    ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`
    : Prisma.empty;
}

function bucketKey(date: Date, grouping: "month" | "year"): string {
  if (grouping === "year") return String(date.getFullYear());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatBucketLabel(key: string, grouping: "month" | "year"): string {
  if (grouping === "year") return key;
  const [year, month] = key.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function buildChart(
  chartRows: Array<{ month_bucket: Date; plan_revenue: number | string | bigint; hire_us_revenue: number | string | bigint }>,
  grouping: "month" | "year",
) {
  const bucketMap = new Map<string, { planRevenue: number; hireUsRevenue: number }>();
  for (const row of chartRows) {
    const key = bucketKey(new Date(row.month_bucket), grouping);
    const entry = bucketMap.get(key) ?? { planRevenue: 0, hireUsRevenue: 0 };
    entry.planRevenue += toNumber(row.plan_revenue);
    entry.hireUsRevenue += toNumber(row.hire_us_revenue);
    bucketMap.set(key, entry);
  }
  return Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
    month: formatBucketLabel(key, grouping),
    planRevenue: v.planRevenue,
    hireUsRevenue: v.hireUsRevenue,
  }));
}

type StatsRow = {
  total_revenue: number | string | bigint;
  plan_revenue: number | string | bigint;
  hire_us_revenue: number | string | bigint;
  total_count: number | string | bigint;
  plan_count: number | string | bigint;
  hire_us_count: number | string | bigint;
};

type TransactionRow = {
  id: string;
  created_at: Date;
  amount_cents: number;
  currency: string;
  status: string;
  payment_type: "plan" | "hire_us";
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  provider_payment_id: string | null;
  user_id: string;
  user_name: string | null;
  user_email: string;
  plan_name: string | null;
  plan_slug: string | null;
};

type ChartRow = {
  month_bucket: Date;
  plan_revenue: number | string | bigint;
  hire_us_revenue: number | string | bigint;
};

async function fetchFinancialStats(args: { paymentTypeExpr: Prisma.Sql; whereSql: Prisma.Sql }) {
  return db.$queryRaw<StatsRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount_cents END), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN p.status = 'completed' AND ${args.paymentTypeExpr} = 'plan' THEN p.amount_cents END), 0) AS plan_revenue,
      COALESCE(SUM(CASE WHEN p.status = 'completed' AND ${args.paymentTypeExpr} = 'hire_us' THEN p.amount_cents END), 0) AS hire_us_revenue,
      COUNT(*) AS total_count,
      SUM(CASE WHEN ${args.paymentTypeExpr} = 'plan' THEN 1 ELSE 0 END) AS plan_count,
      SUM(CASE WHEN ${args.paymentTypeExpr} = 'hire_us' THEN 1 ELSE 0 END) AS hire_us_count
    FROM payments p
    JOIN users u ON u.id = p.user_id
    ${args.whereSql}
  `);
}

async function fetchFinancialTransactions(args: {
  paymentTypeExpr: Prisma.Sql;
  providerPaymentIdExpr: Prisma.Sql;
  whereSql: Prisma.Sql;
  limit: number;
  skip: number;
}) {
  return db.$queryRaw<TransactionRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.created_at,
      p.amount_cents,
      p.currency,
      p.status::text AS status,
      ${args.paymentTypeExpr} AS payment_type,
      p.stripe_payment_intent_id,
      p.stripe_subscription_id,
      ${args.providerPaymentIdExpr} AS provider_payment_id,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      pc.name AS plan_name,
      pc.slug AS plan_slug
    FROM payments p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN plan_configs pc ON pc.id = p.plan_id
    ${args.whereSql}
    ORDER BY p.created_at DESC
    LIMIT ${args.limit} OFFSET ${args.skip}
  `);
}

async function fetchFinancialTotal(whereSql: Prisma.Sql) {
  return db.$queryRaw<Array<{ total: number | string | bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM payments p
    JOIN users u ON u.id = p.user_id
    ${whereSql}
  `);
}

async function fetchFinancialChart(args: {
  paymentTypeExpr: Prisma.Sql;
  chartWhereSql: Prisma.Sql;
  truncUnit: "month" | "year";
}) {
  const bucketExpr =
    args.truncUnit === "year"
      ? Prisma.sql`DATE_TRUNC('year', p.created_at)`
      : Prisma.sql`DATE_TRUNC('month', p.created_at)`;

  return db.$queryRaw<ChartRow[]>(Prisma.sql`
    WITH base AS (
      SELECT
        ${bucketExpr} AS month_bucket,
        p.amount_cents,
        p.status::text AS status,
        ${args.paymentTypeExpr} AS payment_type
      FROM payments p
      JOIN users u ON u.id = p.user_id
      ${args.chartWhereSql}
    )
    SELECT
      month_bucket,
      COALESCE(SUM(CASE WHEN payment_type = 'plan' AND status = 'completed' THEN amount_cents ELSE 0 END), 0) AS plan_revenue,
      COALESCE(SUM(CASE WHEN payment_type = 'hire_us' AND status = 'completed' THEN amount_cents ELSE 0 END), 0) AS hire_us_revenue
    FROM base
    GROUP BY month_bucket
    ORDER BY month_bucket ASC
  `);
}

export async function getAdminFinancials(input: FinancialsQueryInput) {
  const skip = (input.page - 1) * input.limit;
  const [paymentTypeColumnExists, providerPaymentIdExpr] = await Promise.all([
    hasPaymentTypeColumn(),
    resolveProviderPaymentIdExpr(),
  ]);

  const inferredHireUsExpr = Prisma.sql`
    CASE
      WHEN p.amount_cents IN (39900, 99900)
        AND EXISTS (
          SELECT 1
          FROM service_leads sl
          WHERE sl.user_id = p.user_id
            AND sl.service_type IN ('hire_us_starter', 'hire_us_complete')
            AND sl.created_at BETWEEN p.created_at - INTERVAL '7 days' AND p.created_at + INTERVAL '7 days'
        ) THEN 'hire_us'
      ELSE 'plan'
    END
  `;

  const paymentTypeExpr = paymentTypeColumnExists
    ? Prisma.sql`
        CASE
          WHEN p.payment_type::text = 'hire_us' THEN 'hire_us'
          WHEN p.payment_type::text = 'plan' THEN ${inferredHireUsExpr}
          ELSE p.payment_type::text
        END
      `
    : inferredHireUsExpr;
  const whereSql = buildWhereSql(input, paymentTypeExpr, providerPaymentIdExpr);

  const defaultStatsFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const statsWhereSql = buildWhereSql({
    ...input,
    fromParam: input.fromParam ?? defaultStatsFrom.toISOString().slice(0, 10),
  }, paymentTypeExpr, providerPaymentIdExpr);

  const isYearly = input.chartGrouping === "year";
  const chartStart = new Date();
  if (isYearly) {
    chartStart.setFullYear(chartStart.getFullYear() - 4);
    chartStart.setMonth(0);
  } else {
    chartStart.setMonth(chartStart.getMonth() - 11);
  }
  chartStart.setDate(1);
  chartStart.setHours(0, 0, 0, 0);
  const truncUnit = isYearly ? "year" : "month";
  const chartWhereSql = buildWhereSql({
    ...input,
    fromParam: input.fromParam ?? chartStart.toISOString().slice(0, 10),
  }, paymentTypeExpr, providerPaymentIdExpr);

  const [statsRows, transactionsRows, totalRows, chartRows] = await Promise.all([
    fetchFinancialStats({ paymentTypeExpr, whereSql: statsWhereSql }),
    fetchFinancialTransactions({ paymentTypeExpr, providerPaymentIdExpr, whereSql, limit: input.limit, skip }),
    fetchFinancialTotal(whereSql),
    fetchFinancialChart({ paymentTypeExpr, chartWhereSql, truncUnit }),
  ]);

  const statsRow = statsRows[0] ?? {
    total_revenue: 0,
    plan_revenue: 0,
    hire_us_revenue: 0,
    total_count: 0,
    plan_count: 0,
    hire_us_count: 0,
  };

  const transactions = transactionsRows.map((p) => ({
    id: p.id,
    createdAt: new Date(p.created_at).toISOString(),
    user: { id: p.user_id, name: p.user_name, email: p.user_email },
    paymentType: p.payment_type,
    planName: p.plan_name ?? "—",
    planSlug: p.plan_slug,
    amountCents: p.amount_cents,
    amountFormatted: formatCurrency(p.amount_cents, p.currency.toUpperCase()),
    currency: p.currency,
    status: p.status,
    provider: inferProvider({
      stripePaymentIntentId: p.stripe_payment_intent_id,
      stripeSubscriptionId: p.stripe_subscription_id,
      providerPaymentId: p.provider_payment_id,
    }),
  }));

  const filteredCount = toNumber(totalRows[0]?.total ?? 0);
  const totalRevenue = toNumber(statsRow.total_revenue);
  const planRevenue = toNumber(statsRow.plan_revenue);
  const hireUsRevenue = toNumber(statsRow.hire_us_revenue);
  const totalCount = toNumber(statsRow.total_count);
  const planCount = toNumber(statsRow.plan_count);
  const hireUsCount = toNumber(statsRow.hire_us_count);

  return {
    stats: {
      totalRevenue,
      planRevenue,
      hireUsRevenue,
      totalCount,
      planCount,
      hireUsCount,
      totalRevenueFormatted: formatCurrency(totalRevenue, "USD"),
      planRevenueFormatted: formatCurrency(planRevenue, "USD"),
      hireUsRevenueFormatted: formatCurrency(hireUsRevenue, "USD"),
    },
    chart: buildChart(chartRows, input.chartGrouping),
    transactions,
    total: filteredCount,
    page: input.page,
    limit: input.limit,
    totalPages: Math.max(1, Math.ceil(filteredCount / input.limit)),
  };
}
