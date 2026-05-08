"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
} from "recharts";
import type { BarShapeProps } from "recharts";
import { PunctualityData } from "@/types/transport";

interface WorstRoutesChartProps {
  data: PunctualityData[];
  limit?: number;
}

function delayColor(minutes: number) {
  if (minutes < 1) return "#10b981";
  if (minutes < 3) return "#f59e0b";
  if (minutes < 5) return "#f97316";
  return "#ef4444";
}

export default function WorstRoutesChart({ data, limit = 8 }: WorstRoutesChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sorted = [...data]
    .sort((a, b) => b.avg_delay_minutes - a.avg_delay_minutes)
    .slice(0, limit);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-transparent dark:from-rose-950/10 dark:to-transparent pointer-events-none" />

      <div className="relative p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Worst Performing Routes
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Top {limit} routes by average delay
          </p>
        </div>

        <div className="h-[280px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-slate-600 dark:text-slate-400"
                  unit=" min"
                />
                <YAxis
                  type="category"
                  dataKey="route_name"
                  width={80}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-slate-600 dark:text-slate-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--chart-tooltip-bg)",
                    color: "var(--chart-tooltip-text)",
                    border: "1px solid var(--chart-tooltip-border)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                  formatter={(value) => [typeof value === "number" ? `${value.toFixed(1)} min` : value, "Avg Delay"]}
                  cursor={{ fill: "rgba(239,68,68,0.08)" }}
                />
                <Bar
                  dataKey="avg_delay_minutes"
                  radius={[0, 6, 6, 0]}
                  shape={(props: BarShapeProps) => (
                    <Rectangle {...props} fill={delayColor(props.payload?.avg_delay_minutes ?? 0)} />
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
