"use client";

import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ENTERPRISE_VALUE_DRIVERS } from "@/constants/drivers";
import type { DriverScore } from "@/types";

interface DriverBarChartProps {
  driverScores: DriverScore[];
}

export function DriverBarChart({ driverScores }: DriverBarChartProps) {
  const data = driverScores.map((ds) => {
    const driver = ENTERPRISE_VALUE_DRIVERS.find((d) => d.key === ds.key)!;
    return {
      label: driver.label,
      weightLabel: `${Math.round(ds.weight * 100)}%`,
      score: ds.score,
      hex: driver.hex,
    };
  });

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12.5, fill: "#132B4E", fontWeight: 600 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(19,43,78,0.04)" }}
            formatter={(value: number) => [`${value} / 100`, "Score"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E6E9F0", fontSize: 13 }}
          />
          <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={14}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
