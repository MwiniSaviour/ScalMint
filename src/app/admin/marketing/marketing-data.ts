import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma, ConversionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { OPS_COOKIE } from "@/lib/auth/ops-cookie";
import { verifyOpsJwt } from "@/lib/auth/ops-jwt";

const settledConversionWhere: Prisma.ConversionWhereInput = {
  status: { in: [ConversionStatus.APPROVED, ConversionStatus.PAID] },
};

const compactCount = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const moneyFormatters = new Map<string, Intl.NumberFormat>();
function moneyFormatter(currency: string): Intl.NumberFormat {
  const existing = moneyFormatters.get(currency);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  moneyFormatters.set(currency, formatter);
  return formatter;
}

export type MarketingDelta = {
  value: string;
  tone: "up" | "down";
};

export type MarketingKpi = {
  label: "Total Clicks" | "Conversions" | "Conversion Rate" | "Commissions Earned";
  value: string;
  delta: MarketingDelta | null;
};

export type PerformanceDay = {
  key: string;
  label: string;
  clicks: number;
  conversions: number;
};

export type SourceRow = {
  source: string;
  clicks: number;
  conversions: number;
  clicksLabel: string;
  conversionsLabel: string;
  share: number;
  color: string;
};

export type ProductRow = {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
  clicksLabel: string;
  conversionsLabel: string;
  conversionRate: string | null;
  commissionLabel: string;
};

export type ActivityRow = {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
};

export type FunnelRow = {
  key: string;
  label: string;
  percent: number;
  percentLabel: string;
};

export type MarketingData = {
  kpis: MarketingKpi[];
  chart: PerformanceDay[];
  sources: SourceRow[];
  unattributedConversions: number;
  funnel: FunnelRow[];
  funnelHasData: boolean;
  products: ProductRow[];
  genericClicks: number;
  activities: ActivityRow[];
};

function formatCount(value: number): string {
  return compactCount.format(value);
}

function formatMoney(minor: number, currency: string): string {
  return moneyFormatter(currency).format(minor / 100);
}

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const absoluteDayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function relativeTimeLabel(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `about ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return absoluteDayFormatter.format(date);
}

function percentDelta(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const deltaValue = ((current - previous) / previous) * 100;
  const sign = deltaValue >= 0 ? "+" : "-";
  return `${sign}${Math.abs(deltaValue).toFixed(1)}%`;
}

function delta(current: number, previous: number): MarketingDelta | null {
  const value = percentDelta(current, previous);
  if (value == null) return null;
  return { value, tone: current - previous >= 0 ? "up" : "down" };
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

const SEGMENT_COLORS = [
  "rgb(37,63,140)",
  "rgb(194,180,251)",
  "rgb(246,204,223)",
  "rgb(187,214,248)",
] as const;

const WINDOW_DAYS = 30;
const CHART_DAYS = 180;

export async function loadMarketing(): Promise<MarketingData> {
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
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfWindow = new Date(todayUtc - (WINDOW_DAYS - 1) * 86_400_000);
  const startOfPreviousWindow = new Date(todayUtc - (2 * WINDOW_DAYS - 1) * 86_400_000);
  const chartStart = new Date(todayUtc - (CHART_DAYS - 1) * 86_400_000);

  const [clicks, conversions, recent, productsAll, currencyGroups] = await Promise.all([
    db.click.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { id: true, createdAt: true, referer: true, productSlug: true },
    }),
    db.conversion.findMany({
      where: { createdAt: { gte: chartStart }, ...settledConversionWhere },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        commissionAmount: true,
        currency: true,
        clickId: true,
        productId: true,
      },
    }),
    db.conversion.findMany({
      where: { ...settledConversionWhere },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        amount: true,
        commissionAmount: true,
        currency: true,
        product: { select: { name: true } },
      },
    }),
    db.product.findMany({ select: { id: true, name: true, slug: true } }),
    db.conversion.groupBy({
      by: ["currency"],
      where: settledConversionWhere,
      _count: { _all: true },
    }),
  ]);

  for (const group of currencyGroups) {
    if (!/^[A-Z]{3}$/.test(group.currency)) {
      throw new Error(
        `Conversion currency "${group.currency}" is not a 3-letter ISO 4217 code. Fix the affected rows before loading the marketing dashboard.`,
      );
    }
  }

  const productById = new Map(productsAll.map((product) => [product.id, product]));
  const productBySlug = new Map(productsAll.map((product) => [product.slug, product]));

  const dayBuckets = new Map<string, { clicks: number; conversions: number }>();
  for (let i = 0; i < CHART_DAYS; i += 1) {
    const day = new Date(todayUtc - (CHART_DAYS - 1 - i) * 86_400_000);
    dayBuckets.set(dayKey(day), { clicks: 0, conversions: 0 });
  }
  for (const click of clicks) {
    const bucket = dayBuckets.get(dayKey(click.createdAt));
    if (bucket) bucket.clicks += 1;
  }
  for (const conversion of conversions) {
    const bucket = dayBuckets.get(dayKey(conversion.createdAt));
    if (bucket) bucket.conversions += 1;
  }

  const chart: PerformanceDay[] = [...dayBuckets.entries()].map(([key, bucket]) => {
    const [year, month, day] = key.split("-").map(Number);
    return {
      key,
      label: dayLabelFormatter.format(new Date(Date.UTC(year, month - 1, day))),
      clicks: bucket.clicks,
      conversions: bucket.conversions,
    };
  });

  const clicks30 = clicks.filter((click) => click.createdAt >= startOfWindow);
  const clicksPrev30 = clicks.filter(
    (click) => click.createdAt >= startOfPreviousWindow && click.createdAt < startOfWindow,
  );
  const conversions30 = conversions.filter((row) => row.createdAt >= startOfWindow);
  const conversionsPrev30 = conversions.filter(
    (row) => row.createdAt >= startOfPreviousWindow && row.createdAt < startOfWindow,
  );

  const windowCurrencies = [...new Set(conversions30.map((row) => row.currency))];
  const mixedCurrency = windowCurrencies.length > 1;
  const currency = windowCurrencies.length === 1 ? windowCurrencies[0] : null;
  const previousCurrencies = [...new Set(conversionsPrev30.map((row) => row.currency))];
  const previousCurrency = previousCurrencies.length === 1 ? previousCurrencies[0] : null;

  const commission30 = conversions30.reduce((sum, row) => sum + row.commissionAmount, 0);
  const commissionPrev30 = conversionsPrev30.reduce((sum, row) => sum + row.commissionAmount, 0);

  const rate30 = clicks30.length > 0 ? (conversions30.length / clicks30.length) * 100 : null;
  const ratePrev30 =
    clicksPrev30.length > 0 ? (conversionsPrev30.length / clicksPrev30.length) * 100 : null;

  const kpis: MarketingKpi[] = [
    {
      label: "Total Clicks",
      value: formatCount(clicks30.length),
      delta: delta(clicks30.length, clicksPrev30.length),
    },
    {
      label: "Conversions",
      value: formatCount(conversions30.length),
      delta: delta(conversions30.length, conversionsPrev30.length),
    },
    {
      label: "Conversion Rate",
      value: rate30 == null ? "No data yet" : `${rate30.toFixed(1)}%`,
      delta: rate30 == null || ratePrev30 == null ? null : delta(rate30, ratePrev30),
    },
    {
      label: "Commissions Earned",
      value:
        conversions30.length === 0
          ? "No data yet"
          : mixedCurrency
            ? "Multiple currencies"
            : currency
              ? formatMoney(commission30, currency)
              : "No data yet",
      delta:
        currency && previousCurrency === currency && conversionsPrev30.length > 0
          ? delta(commission30, commissionPrev30)
          : null,
    },
  ];

  const sourceCounts = new Map<string, { clicks: number; conversions: number }>();
  for (const click of clicks30) {
    const source = sourceLabel(click.referer);
    const bucket = sourceCounts.get(source) ?? { clicks: 0, conversions: 0 };
    bucket.clicks += 1;
    sourceCounts.set(source, bucket);
  }
  const conversionClickIds = [
    ...new Set(
      conversions30
        .map((row) => row.clickId)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const clickSourceById = new Map<string, string>();
  if (conversionClickIds.length > 0) {
    const clickRows = await db.click.findMany({
      where: { id: { in: conversionClickIds } },
      select: { id: true, referer: true },
    });
    for (const row of clickRows) {
      clickSourceById.set(row.id, sourceLabel(row.referer));
    }
  }
  let unattributedConversions = 0;
  for (const conversion of conversions30) {
    if (!conversion.clickId) {
      unattributedConversions += 1;
      continue;
    }
    const source = clickSourceById.get(conversion.clickId);
    if (!source) {
      unattributedConversions += 1;
      continue;
    }
    const bucket = sourceCounts.get(source) ?? { clicks: 0, conversions: 0 };
    bucket.conversions += 1;
    sourceCounts.set(source, bucket);
  }
  let genericClicks30 = 0;
  for (const click of clicks30) {
    if (!click.productSlug) genericClicks30 += 1;
  }
  const totalSourceClicks = clicks30.length;
  const ranked = [...sourceCounts.entries()].sort((a, b) => b[1].clicks - a[1].clicks);
  if (ranked.length > SEGMENT_COLORS.length) {
    const head = ranked.slice(0, SEGMENT_COLORS.length - 1);
    const merged = ranked.slice(SEGMENT_COLORS.length - 1).reduce(
      (acc, [, value]) => ({ clicks: acc.clicks + value.clicks, conversions: acc.conversions + value.conversions }),
      { clicks: 0, conversions: 0 },
    );
    ranked.length = 0;
    ranked.push(...head, ["Other", merged]);
  }
  const sources: SourceRow[] = ranked.map(([source, value], index) => ({
    source,
    clicks: value.clicks,
    conversions: value.conversions,
    clicksLabel: formatCount(value.clicks),
    conversionsLabel: formatCount(value.conversions),
    share: totalSourceClicks > 0 ? (value.clicks / totalSourceClicks) * 100 : 0,
    color: SEGMENT_COLORS[index],
  }));

  const funnel: FunnelRow[] = [];
  if (totalSourceClicks > 0 || conversions30.length > 0) {
    funnel.push({
      key: "clicks",
      label: "Clicks",
      percent: 100,
      percentLabel: "100%",
    });
    funnel.push({
      key: "conversions",
      label: "Conversions",
      percent: rate30 ?? 0,
      percentLabel: rate30 == null ? "—" : `${rate30.toFixed(1)}%`,
    });
  }

  const productStats = new Map<string, { clicks: number; conversions: number; commission: number }>();
  const statFor = (id: string) => {
    const existing = productStats.get(id);
    if (existing) return existing;
    const bucket = { clicks: 0, conversions: 0, commission: 0 };
    productStats.set(id, bucket);
    return bucket;
  };
  for (const click of clicks30) {
    if (!click.productSlug) continue;
    const product = productBySlug.get(click.productSlug);
    statFor(product ? product.id : `slug:${click.productSlug}`).clicks += 1;
  }
  for (const conversion of conversions30) {
    const bucket = statFor(conversion.productId);
    bucket.conversions += 1;
    bucket.commission += conversion.commissionAmount;
  }

  const products: ProductRow[] = [...productStats.entries()]
    .map(([key, stats]) => {
      const product = key.startsWith("slug:") ? null : productById.get(key);
      if (!key.startsWith("slug:") && !product) {
        throw new Error(
          `A conversion references product ${key}, which no longer exists. Restore the product row before loading the marketing dashboard.`,
        );
      }
      const name = product?.name ?? (key.startsWith("slug:") ? key.slice("slug:".length) : key);
      const rate =
        stats.clicks > 0 ? `${((stats.conversions / stats.clicks) * 100).toFixed(1)}%` : stats.conversions > 0 ? "—" : "0.0%";
      const commissionLabel = mixedCurrency
        ? "Multiple currencies"
        : currency
          ? formatMoney(stats.commission, currency)
          : "—";
      return {
        id: key,
        name,
        clicks: stats.clicks,
        conversions: stats.conversions,
        clicksLabel: formatCount(stats.clicks),
        conversionsLabel: formatCount(stats.conversions),
        conversionRate: rate,
        commissionLabel,
      };
    })
    .filter((row) => row.clicks > 0 || row.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks)
    .slice(0, 5);

  const activities: ActivityRow[] = recent.map((row) => ({
    id: row.id,
    title: `Conversion — ${row.product.name}`,
    subtitle: `${formatMoney(row.amount, row.currency)} · commission ${formatMoney(row.commissionAmount, row.currency)}`,
    timeLabel: relativeTimeLabel(row.createdAt, now),
  }));

  return {
    kpis,
    chart,
    sources,
    unattributedConversions,
    funnel,
    funnelHasData: funnel.length > 0,
    products,
    genericClicks: genericClicks30,
    activities,
  };
}
