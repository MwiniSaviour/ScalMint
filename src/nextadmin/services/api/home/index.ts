import { delay } from "@/nextadmin/utils/delay";
import {
  homeOverviewStatsRawData,
  inventoryOverviewRawData,
  lastTransactionsRawData,
  salesChartMonthlyRawData,
  salesChartYearlyRawData,
  topProductsRawData,
  trafficSourcesRawData,
} from "./data";
import type {
  Granularity,
  HomeOverviewStatsRawResponse,
  InventoryOverviewRawResponse,
  LastTransactionsRawResponse,
  SalesChartRawResponse,
  TopProductsRawResponse,
  TrafficSourcesRawResponse,
} from "./types";

export type * from "./types";

export async function getHomeOverviewStats(): Promise<HomeOverviewStatsRawResponse> {
  const res = await fetch("/api/admin/overview", { credentials: "include" });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.assign("/admin/login");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    await delay(200);
    return homeOverviewStatsRawData;
  }
  return (await res.json()) as HomeOverviewStatsRawResponse;
}

export async function getSalesChartData(
  granularity: Granularity = "monthly",
): Promise<SalesChartRawResponse> {
  await delay(1200);
  return granularity === "yearly" ? salesChartYearlyRawData : salesChartMonthlyRawData;
}

export async function getInventoryOverviewData(): Promise<InventoryOverviewRawResponse> {
  await delay(1200);
  return inventoryOverviewRawData;
}

export async function getTopProductsData(): Promise<TopProductsRawResponse> {
  await delay(900);
  return topProductsRawData;
}

export async function getTrafficSourcesData(): Promise<TrafficSourcesRawResponse> {
  await delay(1000);
  return trafficSourcesRawData;
}

export async function getLastTransactionsData(): Promise<LastTransactionsRawResponse> {
  await delay(950);
  return lastTransactionsRawData;
}
