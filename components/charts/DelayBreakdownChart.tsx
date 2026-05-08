"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Rectangle,
} from "recharts";
import type { BarShapeProps } from "recharts";
import { DelayBand } from "@/types/transport";

interface DelayBreakdownChartProps {
  data: DelayBand[];
}

const BAND_COLORS: Record<string, string> = {
  "On Time": "#10b981",
  "Slight Delay": "#f59e0b",
  "Major Delay": "#f97316",
};

const BAND_ORDER = ["On Time", "Slight Delay", "Major Delay"];

export default function DelayBreakdownChart({ data }: DelayBreakdownChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = BAND_ORDER
    .map((band) => {
      const found = data.find((d) => d.band === band);
      return { name: band, value: found?.count ?? 0, color: BAND_COLORS[band] ?? "#94a3b8" };
    })
    .filter((d) => d.value > 0);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/10 dark:to-transparent pointer-events-none" />

      <div className="relative p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Delay Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Routes by delay severity
          </p>
        </div>

        <div className="h-[280px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-slate-600 dark:text-slate-400"
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fill: "currentColor", fontSize: 12 }}
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
                  formatter={(value) => [`${value} routes`, "Count"]}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 6, 6, 0]}
                  shape={(props: BarShapeProps) => (
                    <Rectangle {...props} fill={props.payload?.color ?? "#94a3b8"} />
                  )}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fill: "currentColor", fontSize: 12, fontWeight: 600 }}
                    formatter={(v) => `${v} routes`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
