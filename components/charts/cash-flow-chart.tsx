"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TimeSeriesPoint } from "@/types";

interface CashFlowChartProps {
  data: TimeSeriesPoint[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = data.map((d) => ({ month: d.month, Inflow: d.value, Outflow: d.secondaryValue }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E9F0" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8B98AC" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8B98AC" }} />
          <Tooltip
            formatter={(value: number) => [`₹${value}L`, ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E6E9F0", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12.5 }} iconType="circle" iconSize={8} />
          <Bar dataKey="Inflow" fill="#1FB894" radius={[6, 6, 0, 0]} barSize={16} />
          <Bar dataKey="Outflow" fill="#D97757" radius={[6, 6, 0, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
