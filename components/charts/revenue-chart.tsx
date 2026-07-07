"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TimeSeriesPoint } from "@/types";

interface RevenueChartProps {
  data: TimeSeriesPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0E8C77" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0E8C77" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E9F0" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8B98AC" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8B98AC" }} />
          <Tooltip
            formatter={(value: number) => [`₹${value}L`, "Revenue"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E6E9F0", fontSize: 13 }}
          />
          <Area type="monotone" dataKey="value" stroke="#0E8C77" strokeWidth={2.5} fill="url(#revenueFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
