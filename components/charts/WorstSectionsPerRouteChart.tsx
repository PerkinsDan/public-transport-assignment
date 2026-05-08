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
import { RouteSection } from "@/types/transport";

interface WorstSectionsPerRouteChartProps {
  data: RouteSection[];
}

function delayColor(minutes: number) {
  if (minutes < 1) return "#10b981";
  if (minutes < 3) return "#f59e0b";
  if (minutes < 5) return "#f97316";
  return "#ef4444";
}

export default function WorstSectionsPerRouteChart({ data }: WorstSectionsPerRouteChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const routes = Array.from(new Set(data.map((s) => s.route_name))).sort();
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const effectiveRoute = routes.includes(selectedRoute) ? selectedRoute : (routes[0] ?? "");

  const chartData = data
    .filter((s) => s.route_name === effectiveRoute)
    .sort((a, b) => b.avg_delay_minutes - a.avg_delay_minutes)
    .map((s) => ({ ...s, label: `${s.from_stop} → ${s.to_stop}` }));

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/10 dark:to-transparent pointer-events-none" />

      <div className="relative p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Worst Sections by Route
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Stop-to-stop segments ranked by average delay for selected route
            </p>
          </div>

          <select
            value={effectiveRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="shrink-0 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {routes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500">
            No data available for this route
          </div>
        ) : (
          <div style={{ height: chartData.length * 38 + 40 }}>
            {mounted && (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                <BarChart
                  data={chartData}
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
                    dataKey="label"
                    width={160}
                    tick={{ fill: "currentColor", fontSize: 10 }}
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
                    formatter={(value, _name, props) => {
                      const item = props.payload as RouteSection & { label: string };
                      return [
                        `${typeof value === "number" ? value.toFixed(1) : value} min (${item.trip_count} trips)`,
                        "Avg Delay",
                      ];
                    }}
                    cursor={{ fill: "rgba(245,158,11,0.08)" }}
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
        )}
      </div>
    </section>
  );
}
