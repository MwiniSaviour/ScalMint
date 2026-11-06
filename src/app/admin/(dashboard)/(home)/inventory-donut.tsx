"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const FILL_LIVE = "#5750f1";
const FILL_REST = "var(--color-card-border)";

export function InventoryDonut({
  total,
  live,
}: {
  total: number;
  live: number;
}) {
  if (total === 0) {
    return (
      <div className="flex h-42.25 w-full items-center justify-center">
        <p className="text-sm text-text-tertiary">No products yet</p>
      </div>
    );
  }

  const rest = total - live;
  const percent = Math.round((live / total) * 100);
  const slices = [
    { name: "Live", value: live },
    { name: "Not live", value: rest },
  ];

  return (
    <div className="relative mx-auto h-42.25 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={58}
            outerRadius={80}
            strokeWidth={0}
            isAnimationActive={false}
          >
            <Cell fill={FILL_LIVE} />
            <Cell fill={FILL_REST} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl leading-6 font-semibold text-text-primary">{percent}%</p>
        <p className="mt-1 text-sm leading-5 text-text-tertiary">Live</p>
      </div>
    </div>
  );
}
