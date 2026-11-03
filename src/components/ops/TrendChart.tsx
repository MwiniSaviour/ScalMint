"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({
  data,
  xKey,
  yKey,
  unit,
  emptyLabel,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  unit: string;
  emptyLabel: string;
}) {
  if (!data.length) {
    return <p className="text-sm text-text-tertiary">{emptyLabel}</p>;
  }
  const allZero = data.every((row) => Number(row[yKey] ?? 0) === 0);
  if (allZero) {
    return <p className="text-sm text-text-tertiary">0 {unit} at every point in this window</p>;
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip
            formatter={(value) => [`${value} ${unit}`, ""]}
            labelStyle={{ fontSize: 12 }}
            contentStyle={{ fontSize: 12 }}
          />
          <Area type="monotone" dataKey={yKey} stroke="currentColor" fill="currentColor" fillOpacity={0.12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
