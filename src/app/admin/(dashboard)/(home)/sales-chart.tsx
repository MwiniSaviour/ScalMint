"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { DeltaDownIcon, DeltaUpIcon } from "@/components/demo/primitives";
import type { SalesChartData, SalesRange } from "./dashboard-data";

const SALES_COLOR = "#5750f1";
const REVENUE_COLOR = "#a855f7";

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(value);
}

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <p className="flex items-center gap-1 text-sm leading-5 text-text-secondary">
      <span className={`font-medium ${up ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
        {Math.abs(value).toFixed(2)}%
      </span>
      <span className={up ? "size-4 text-green-700 dark:text-green-400" : "size-4 text-red-700 dark:text-red-400"}>
        {up ? <DeltaUpIcon /> : <DeltaDownIcon />}
      </span>
      <span>{label}</span>
    </p>
  );
}

export function SalesChart({ sales }: { sales: SalesChartData }) {
  const [range, setRange] = useState<"monthly" | "yearly">("monthly");
  const active: SalesRange = sales[range];
  const { mixedCurrency, currency } = sales;

  const amountFor = (total: number | null): string => {
    if (mixedCurrency) return "Multiple currencies";
    if (currency && total != null) return formatMoney(total, currency);
    return "No data yet";
  };

  const deltaLabel = range === "monthly" ? "vs prior 12 months" : "vs prior 5 years";
  const basisCaption = range === "monthly" ? "Last 12 months · UTC" : "Last 5 years · UTC";

  const chartData = active.points.map((point) => ({
    label: point.label,
    Sales: point.sales,
    Revenue: point.revenue,
  }));

  return (
    <>
      <div className="relative mb-6 flex w-full flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-8 sm:flex-row">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="size-2 rounded-xs bg-brand-500" />
              <span className="text-sm leading-5 font-medium text-text-secondary">Sales Amount</span>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-text-primary md:text-2xl md:leading-8">
                {amountFor(active.totalSales)}
              </h3>
              <Delta value={active.salesDelta} label={deltaLabel} />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="size-2 rounded-xs bg-purple-500" />
              <span className="text-sm leading-5 font-medium text-text-secondary">Revenue Amount</span>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-text-primary md:text-2xl md:leading-8">
                {amountFor(active.totalRevenue)}
              </h3>
              <Delta value={active.revenueDelta} label={deltaLabel} />
            </div>
          </div>
        </div>
        <div>
          <label className="sr-only" htmlFor="sales-range">
            Select time range
          </label>
          <select
            id="sales-range"
            value={range}
            onChange={(event) => setRange(event.target.value as "monthly" | "yearly")}
            className="flex h-8.5 items-center justify-between gap-1.5 rounded-lg border border-card-border bg-button-primary-outline-background px-3 py-1.5 pr-2.5 pl-3 text-sm font-medium text-button-primary-outline-text shadow-xs outline-none transition focus:ring-4 focus:ring-button-outline-focus-ring"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <p className="mb-2 text-xs leading-4 text-text-tertiary">{basisCaption}</p>
      <div className="text-text-primary relative h-67.5 w-full p-0">
        {mixedCurrency ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
            <p className="text-sm font-medium text-text-primary">Multiple currencies</p>
            <p className="max-w-72 text-center text-xs leading-4 text-text-tertiary">
              Sales and revenue are recorded in more than one currency, so they cannot be charted as a single
              series.
            </p>
          </div>
        ) : active.hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SALES_COLOR} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={SALES_COLOR} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-card-border)" strokeDasharray="0" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
                dy={8}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-card-border)" }}
                contentStyle={{
                  background: "var(--color-card-background)",
                  border: "1px solid var(--color-card-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  currency && !mixedCurrency ? formatMoney(Number(value), currency) : "Multiple currencies",
                  String(name),
                ]}
              />
              <Area
                type="monotone"
                dataKey="Revenue"
                stroke={REVENUE_COLOR}
                strokeWidth={2}
                fill="url(#revenueFill)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="Sales"
                stroke={SALES_COLOR}
                strokeWidth={2}
                fill="url(#salesFill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
            <p className="text-sm font-medium text-text-primary">No sales data yet</p>
            <p className="text-xs leading-4 text-text-tertiary">
              Verified conversions will chart here once affiliates close their first sales.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
