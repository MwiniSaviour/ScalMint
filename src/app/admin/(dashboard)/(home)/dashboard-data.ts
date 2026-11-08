import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma, ConversionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { OPS_COOKIE } from "@/lib/auth/ops-cookie";
import { verifyOpsJwt } from "@/lib/auth/ops-jwt";

const settledConversionWhere: Prisma.ConversionWhereInput = {
  status: { in: [ConversionStatus.APPROVED, ConversionStatus.PAID] },
};
const notRejectedConversionWhere: Prisma.ConversionWhereInput = {
  status: { not: ConversionStatus.REJECTED },
};

export type SalesPoint = { label: string; sales: number; revenue: number };

export type SalesRange = {
  points: SalesPoint[];
  totalSales: number | null;
  totalRevenue: number | null;
  salesDelta: number | null;
  revenueDelta: number | null;
  hasData: boolean;
};

export type SalesChartData = {
  mixedCurrency: boolean;
  currency: string | null;
  monthly: SalesRange;
  yearly: SalesRange;
};

export type InventoryData = {
  total: number;
  live: number;
  comingSoon: number;
};

export type TopProductRow = {
  id: string;
  name: string;
  sales: number;
  amountLabel: string;
  shareLabel: string | null;
};

export type BreakdownRow = {
  label: string;
  count: number;
  countLabel: string;
  width: number;
};

export type TransactionStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export type TransactionRow = {
  id: string;
  orderRef: string;
  createdAtLabel: string;
  customerLabel: string;
  amountLabel: string;
  status: TransactionStatus;
};

export type DashboardData = {
  kpis: {
    totalClicks: string;
    totalProfit: string;
    totalOrders: string;
    uniqueCustomerEmails: string;
  };
  sales: SalesChartData;
  inventory: InventoryData;
  topProducts: TopProductRow[];
  traffic: BreakdownRow[];
  regions: BreakdownRow[];
  transactions: TransactionRow[];
};

const countFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

type Bucket = { sales: number; revenue: number; count: number };

function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function buildRange(
  buckets: Map<string, Bucket>,
  keys: { key: string; label: string }[],
  currency: string | null,
  previous?: { sales: number; revenue: number },
): SalesRange {
  let sales = 0;
  let revenue = 0;
  let count = 0;

  const points = keys.map(({ key, label }) => {
    const bucket = buckets.get(key);
    sales += bucket?.sales ?? 0;
    revenue += bucket?.revenue ?? 0;
    count += bucket?.count ?? 0;
    return {
      label,
      sales: (bucket?.sales ?? 0) / 100,
      revenue: (bucket?.revenue ?? 0) / 100,
    };
  });

  const hasData = count > 0;
  const currenciesReady = currency !== null;

  return {
    points,
    totalSales: currenciesReady && hasData ? sales / 100 : null,
    totalRevenue: currenciesReady && hasData ? revenue / 100 : null,
    salesDelta:
      currenciesReady && hasData && previous && previous.sales > 0
        ? percentDelta(sales, previous.sales)
        : null,
    revenueDelta:
      currenciesReady && hasData && previous && previous.revenue > 0
        ? percentDelta(revenue, previous.revenue)
        : null,
    hasData,
  };
}

function previousKeys(
  buckets: Map<string, Bucket>,
  keys: { key: string; label: string }[],
) {
  return keys.reduce(
    (totals, { key }) => {
      const bucket = buckets.get(key);
      totals.sales += bucket?.sales ?? 0;
      totals.revenue += bucket?.revenue ?? 0;
      return totals;
    },
    { sales: 0, revenue: 0 },
  );
}

function sourceLabel(referer: string | null): string {
  if (!referer) return "Direct";
  const raw = referer.trim();
  if (!raw) return "Direct";
  try {
    const host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
    return host || "Direct";
  } catch {
    return raw.length > 32 ? `${raw.slice(0, 31)}…` : raw;
  }
}

function toBreakdown(counts: Map<string, number>): BreakdownRow[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = sorted[0]?.[1] ?? 0;
  return sorted.map(([label, count]) => ({
    label,
    count,
    countLabel: formatCount(count),
    width: max > 0 ? Math.max(8, Math.round((count / max) * 100)) : 0,
  }));
}

export async function loadDashboard(): Promise<DashboardData> {
  const token = (await cookies()).get(OPS_COOKIE)?.value;
  if (!token) redirect("/admin/login");

  const session = await verifyOpsJwt(token);
  if (!session) redirect("/admin/login");

  const operator = await db.opsOperator.findUnique({
    where: { id: session.operatorId },
    select: { status: true, sessionVersion: true },
  });
  if (
    !operator ||
    operator.status !== "ACTIVE" ||
    operator.sessionVersion !== session.sessionVersion
  ) {
    redirect("/admin/login");
  }

  const now = new Date();
  const chartStart = new Date(Date.UTC(now.getUTCFullYear() - 9, 0, 1));

  const [
    clickCount,
    orderCount,
    sums,
    customerCountRows,
    products,
    currencyGroups,
    chartMonthRows,
    recent,
    productGroups,
    refererGroups,
    countryGroups,
  ] = await Promise.all([
    db.click.count(),
    db.conversion.count({ where: settledConversionWhere }),
    db.conversion.aggregate({
      where: settledConversionWhere,
      _sum: { amount: true, commissionAmount: true },
    }),
    db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "customerEmail")::bigint AS "count"
      FROM "Conversion"
      WHERE "status" IN ('APPROVED', 'PAID') AND "customerEmail" IS NOT NULL`,
    db.product.findMany({ select: { id: true, name: true, status: true } }),
    db.conversion.groupBy({
      by: ["currency"],
      where: settledConversionWhere,
      _count: { _all: true },
    }),
    db.$queryRaw<Array<{ month: string; sales: bigint; revenue: bigint; count: bigint }>>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS "month",
             COALESCE(SUM("amount"), 0)::bigint AS "sales",
             COALESCE(SUM("commissionAmount"), 0)::bigint AS "revenue",
             COUNT(*)::bigint AS "count"
      FROM "Conversion"
      WHERE "status" IN ('APPROVED', 'PAID') AND "createdAt" >= ${chartStart}
      GROUP BY 1
      ORDER BY 1`,
    db.conversion.findMany({
      where: notRejectedConversionWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        customerRef: true,
        createdAt: true,
        customerEmail: true,
        amount: true,
        currency: true,
        status: true,
      },
    }),
    db.conversion.groupBy({
      by: ["productId"],
      where: settledConversionWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.click.groupBy({ by: ["referer"], _count: { _all: true } }),
    db.click.groupBy({ by: ["country"], _count: { _all: true } }),
  ]);

  for (const group of currencyGroups) {
    if (!/^[A-Z]{3}$/.test(group.currency)) {
      throw new Error(
        `Conversion currency "${group.currency}" is not a 3-letter ISO 4217 code. Fix the affected rows before loading the dashboard.`,
      );
    }
  }

  const currencies = currencyGroups.map((group) => group.currency);
  const mixedCurrency = currencies.length > 1;
  const currency = currencies.length === 1 ? currencies[0] : null;

  const monthBuckets = new Map<string, Bucket>();
  const yearBuckets = new Map<string, Bucket>();
  for (const row of chartMonthRows) {
    const monthBucket: Bucket = {
      sales: Number(row.sales),
      revenue: Number(row.revenue),
      count: Number(row.count),
    };
    monthBuckets.set(row.month, monthBucket);
    const year = row.month.slice(0, 4);
    const yearBucket = yearBuckets.get(year) ?? { sales: 0, revenue: 0, count: 0 };
    yearBucket.sales += monthBucket.sales;
    yearBucket.revenue += monthBucket.revenue;
    yearBucket.count += monthBucket.count;
    yearBuckets.set(year, yearBucket);
  }

  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    return { key: monthKey(date), label: monthFormatter.format(date) };
  });
  const previousMonthKeys = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23 + i, 1));
    return { key: monthKey(date), label: monthFormatter.format(date) };
  });

  const yearKeys = Array.from({ length: 5 }, (_, i) => {
    const year = now.getUTCFullYear() - 4 + i;
    return { key: String(year), label: String(year) };
  });
  const previousYearKeys = Array.from({ length: 5 }, (_, i) => {
    const year = now.getUTCFullYear() - 9 + i;
    return { key: String(year), label: String(year) };
  });

  const previousMonthly = previousKeys(monthBuckets, previousMonthKeys);
  const monthly = buildRange(monthBuckets, monthKeys, currency, previousMonthly);
  const previousYearly = previousKeys(yearBuckets, previousYearKeys);
  const yearly = buildRange(yearBuckets, yearKeys, currency, previousYearly);

  const productById = new Map(products.map((product) => [product.id, product]));
  const totalSalesMinor = sums._sum.amount ?? 0;

  let live = 0;
  let comingSoon = 0;
  for (const product of products) {
    switch (product.status) {
      case "LIVE":
        live += 1;
        break;
      case "COMING_SOON":
        comingSoon += 1;
        break;
      default:
        throw new Error(
          `Product "${product.id}" has an unknown status. Fix the product row before loading the dashboard.`,
        );
    }
  }

  const topProducts = [...productGroups]
    .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
    .slice(0, 5)
    .map((group) => {
      const product = productById.get(group.productId);
      if (!product) {
        throw new Error(
          `A conversion references product ${group.productId}, which no longer exists. Restore the product row before loading the dashboard.`,
        );
      }
      const amount = group._sum.amount ?? 0;
      return {
        id: product.id,
        name: product.name,
        sales: group._count._all,
        amountLabel: mixedCurrency
          ? "Multiple currencies"
          : currency
            ? formatMoney(amount, currency)
            : "No data yet",
        shareLabel:
          !mixedCurrency && currency && totalSalesMinor > 0
            ? `${((amount / totalSalesMinor) * 100).toFixed(1)}% of sales`
            : null,
      } satisfies TopProductRow;
    });

  const trafficCounts = new Map<string, number>();
  for (const group of refererGroups) {
    const label = sourceLabel(group.referer);
    trafficCounts.set(label, (trafficCounts.get(label) ?? 0) + group._count._all);
  }

  const regionCounts = new Map<string, number>();
  for (const group of countryGroups) {
    const label = group.country?.trim().toUpperCase() || "Unknown";
    regionCounts.set(label, (regionCounts.get(label) ?? 0) + group._count._all);
  }

  return {
    kpis: {
      totalClicks: formatCount(clickCount),
      totalProfit: mixedCurrency
        ? "Multiple currencies"
        : currency
          ? formatMoney(sums._sum.commissionAmount ?? 0, currency)
          : "No data yet",
      totalOrders: formatCount(orderCount),
      uniqueCustomerEmails: formatCount(Number(customerCountRows[0]?.count ?? 0)),
    },
    sales: {
      mixedCurrency,
      currency,
      monthly,
      yearly,
    },
    inventory: {
      total: products.length,
      live,
      comingSoon,
    },
    topProducts,
    traffic: toBreakdown(trafficCounts),
    regions: toBreakdown(regionCounts),
    transactions: recent.map((conversion) => ({
      id: conversion.id,
      orderRef: `#${(conversion.customerRef ?? conversion.id).slice(-8).toUpperCase()}`,
      createdAtLabel: `${dateFormatter.format(conversion.createdAt)} ${timeFormatter.format(conversion.createdAt)}`,
      customerLabel: conversion.customerEmail ?? "No email recorded",
      amountLabel: formatMoney(conversion.amount, conversion.currency),
      status: conversion.status,
    })),
  };
}
