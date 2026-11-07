"use client";

import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";

function ChartEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-center text-xs leading-4 text-text-tertiary">{body}</p>
    </div>
  );
}

export function LineSparkline({ data, height }: { data: { key: string; label: string; value: number }[]; height: string }) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  return (
    <div className={`text-text-primary ${height} w-full p-0`}>
      <div className="flex h-full w-full items-center justify-center px-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-card-border)" />
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
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                name="Revenue"
                stroke="var(--color-brand-500)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty
            title="No revenue data yet"
            body="Revenue will chart here once a SaaS source is connected."
          />
        )}
      </div>
    </div>
  );
}
