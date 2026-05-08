"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PunctualityData } from "@/types/transport";

interface PunctualityChartProps {
  data: PunctualityData[];
}

export default function PunctualityChart({ data }: PunctualityChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/10 dark:to-transparent pointer-events-none" />
      
      <div className="relative p-4 sm:p-8">
        <div className="mb-4 sm:mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Average Delay by Route
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Average departure delay performance for each route
              </p>
            </div>
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-950/40 rounded-lg">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                {data.length} routes
              </span>
            </div>
          </div>
        </div>

        <div className="h-[400px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="route_name"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  className="text-slate-700 dark:text-slate-300"
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  className="text-slate-700 dark:text-slate-300"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--chart-tooltip-bg)",
                    color: "var(--chart-tooltip-text)",
                    border: "1px solid var(--chart-tooltip-border)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar
                  dataKey="avg_delay_minutes"
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
