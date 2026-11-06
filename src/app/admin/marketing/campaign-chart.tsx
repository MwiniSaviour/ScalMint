"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DeltaDownIcon, DeltaUpIcon } from "@/components/demo/primitives";
import type { PerformanceDay } from "./marketing-data";

const CLICKS_COLOR = "#5750f1";
const CONVERSIONS_COLOR = "#a855f7";

type Range = 7 | 30 | 90;

const tabBase =
  "rounded-md px-3 py-1 text-sm font-medium transition-colors duration-200";
const tabInactive = `${tabBase} text-text-tertiary hover:text-text-primary`;
const tabActive = `${tabBase} bg-tab-active-background text-text-primary shadow-xs`;

const compactAxisFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function compactAxis(value: number): string {
  return compactAxisFormatter.format(value);
}

function deltaLabel(current: number, previous: number): { text: string; up: boolean } | null {
  if (previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "-";
  return { text: `${sign}${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };
}

export function CampaignChart({ days }: { days: PerformanceDay[] }) {
  const [range, setRange] = useState<Range>(30);

  const current = days.slice(days.length - range);
  const previous = days.slice(days.length - range * 2, days.length - range);
  const clicks = current.reduce((sum, day) => sum + day.clicks, 0);
  const previousClicks = previous.reduce((sum, day) => sum + day.clicks, 0);
  const conversions = current.reduce((sum, day) => sum + day.conversions, 0);
  const delta = deltaLabel(clicks, previousClicks);
  const hasData = clicks > 0 || conversions > 0;

  return (
    <>
      <div className="relative flex w-full flex-wrap items-center justify-between gap-3 pb-5">
        <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">
          Campaign Performance
        </h3>
        <div className="flex items-center gap-1 rounded-lg border-none bg-tab-background p-1">
          {([7, 30, 90] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={range === value}
              onClick={() => setRange(value)}
              className={range === value ? tabActive : tabInactive}
            >
              {value} Days
            </button>
          ))}
        </div>
      </div>
      <div className="text-text-primary p-0">
        <div>
          <p className="mb-2 text-sm text-text-tertiary">Total Clicks</p>
          <div className="flex min-h-8 flex-wrap items-center">
            <h3 className="mr-3 text-xl font-semibold text-text-primary md:text-2xl md:leading-8">
              {clicks.toLocaleString("en")}
            </h3>
            {delta ? (
              <>
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${delta.up ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                >
                  {delta.text}
                  {delta.up ? <DeltaUpIcon /> : <DeltaDownIcon />}
                </span>
                <span className="ml-1 text-sm text-text-secondary">vs previous {range} days</span>
              </>
            ) : (
              <span className="text-sm text-text-tertiary">No previous {range}-day baseline</span>
            )}
          </div>
        </div>
        <div
          className="mt-6 h-63.5 w-full"
          role="img"
          aria-label={`Line chart of daily clicks (${clicks.toLocaleString("en")}) and conversions (${conversions.toLocaleString("en")}) over the last ${range} days`}
        >
          {hasData ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="text-xs tracking-[-0.2px] [&_.recharts-cartesian-axis-tick-value]:fill-text-tertiary [&_.recharts-cartesian-grid_line]:stroke-card-border [&_.recharts-wrapper_*]:focus:not-focus-visible:outline-none [&_.recharts-wrapper_*]:focus-visible:outline-2 [&_.recharts-wrapper_*]:focus-visible:outline-offset-2 [&_.recharts-wrapper_*]:focus-visible:outline-brand-500"
            >
              <LineChart data={current} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="var(--color-card-border)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                  tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={38}
                  allowDecimals={false}
                  tickFormatter={compactAxis}
                  tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--color-card-border)" }}
                  contentStyle={{
                    background: "var(--color-card-background)",
                    border: "1px solid var(--color-card-border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--color-text-primary)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke={CLICKS_COLOR}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="Conversions"
                  stroke={CONVERSIONS_COLOR}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
              <p className="text-sm font-medium text-text-primary">No clicks recorded yet</p>
              <p className="text-center text-xs leading-4 text-text-tertiary">
                Affiliate clicks and conversions will chart here once campaigns start driving traffic.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
