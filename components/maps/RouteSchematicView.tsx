"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RouteStops } from "@/types/transport";
import {
  ROUTE_COLORS,
  SchematicNetwork,
  buildSchematicNetwork,
} from "@/lib/transport/route-schematic";

type RouteSchematicViewProps = {
  routes: RouteStops;
  selectedRouteNames: string[];
};

// Arc path (no fill) for interchange station ring segments
function getArcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default function RouteSchematicView({
  routes,
  selectedRouteNames,
}: RouteSchematicViewProps) {
  const schematicNetwork: SchematicNetwork | null = useMemo(
    () => buildSchematicNetwork(routes, selectedRouteNames),
    [routes, selectedRouteNames],
  );

  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

      setTransform((prev) => {
        const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.3), 8);
        const ratio = newScale / prev.scale;
        return {
          scale: newScale,
          x: mouseX - (mouseX - prev.x) * ratio,
          y: mouseY - (mouseY - prev.y) * ratio,
        };
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    setTransform((prev) => {
      dragStartRef.current = { x: e.clientX - prev.x, y: e.clientY - prev.y };
      return prev;
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const resetZoom = () => setTransform({ scale: 1, x: 0, y: 0 });

  if (!schematicNetwork) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 text-sm text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="font-medium">Select at least one route to view the schematic</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="relative h-[520px] overflow-auto">
        <div className="min-w-[960px] space-y-6 p-8">
          {/* Network overview with pan/zoom */}
          <div className="rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900/80 p-6 shadow-sm dark:border-slate-700">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Network Overview
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Scroll to zoom · Drag to pan · Labels appear when zoomed in or on hover
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.25, 8) }))}
                  className="h-7 w-7 rounded border border-slate-200 bg-white text-sm font-bold shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="h-7 px-2 rounded border border-slate-200 bg-white text-xs shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale / 1.25, 0.3) }))}
                  className="h-7 w-7 rounded border border-slate-200 bg-white text-sm font-bold shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  −
                </button>
              </div>
            </div>

            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-xl bg-[#f5f3ee] dark:bg-slate-950"
              style={{
                height: 400,
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: "0 0",
                  width: "100%",
                  willChange: "transform",
                }}
              >
                <svg
                  viewBox={`0 0 ${schematicNetwork.width} ${schematicNetwork.height}`}
                  className="h-auto w-full min-w-[920px]"
                  role="img"
                  aria-label="Route schematic network"
                >
                  {/* Colored route lines */}
                  {schematicNetwork.routePaths.map(({ routeName, points }, index) => {
                    const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
                    if (points.length === 0) return null;
                    const d = points
                      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                      .join(" ");
                    return (
                      <path
                        key={`line-${routeName}`}
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {/* Station nodes */}
                  {schematicNetwork.nodes.map((node) => {
                    const point = schematicNetwork.nodePositions.get(node.stationKey);
                    if (!point) return null;

                    const isHovered = hoveredNode === node.stationKey;
                    const labelVisible = isHovered;
                    const labelOffset = point.y < schematicNetwork.height / 2 ? 28 : -18;
                    const n = node.routeIndices.length;
                    const isInterchange = n > 1;

                    // Ring radius for interchange; dot radius for single-route
                    const ringR = 6;
                    const dotR = 5;

                    return (
                      <g
                        key={`node-${node.stationKey}`}
                        onMouseEnter={() => setHoveredNode(node.stationKey)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ cursor: "default" }}
                      >
                        {isInterchange ? (
                          <>
                            {/* Interchange: white disc + colored arc segments per route */}
                            <circle cx={point.x} cy={point.y} r={ringR + 3} fill="white" />
                            {node.routeIndices.map((routeIndex, i) => {
                              const sliceDeg = 360 / n;
                              const gap = n > 1 ? 8 : 0;
                              const startDeg = i * sliceDeg - 90 + gap / 2;
                              const endDeg = (i + 1) * sliceDeg - 90 - gap / 2;
                              return (
                                <path
                                  key={i}
                                  d={getArcPath(point.x, point.y, ringR, startDeg, endDeg)}
                                  stroke={ROUTE_COLORS[routeIndex % ROUTE_COLORS.length]}
                                  strokeWidth="5"
                                  fill="none"
                                  strokeLinecap="round"
                                />
                              );
                            })}
                            <circle cx={point.x} cy={point.y} r={ringR - 5} fill="white" />
                          </>
                        ) : (
                          <>
                            {/* Regular stop: white dot with route-colored border */}
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={dotR + 2}
                              fill="white"
                            />
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={dotR}
                              fill="white"
                              stroke={ROUTE_COLORS[node.routeIndices[0] % ROUTE_COLORS.length]}
                              strokeWidth="2.5"
                            />
                          </>
                        )}

                        {/* Invisible hit area */}
                        <circle cx={point.x} cy={point.y} r={22} fill="transparent" />

                        {labelVisible && (
                          <text
                            x={point.x}
                            y={point.y + labelOffset}
                            textAnchor="middle"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              fill: "#1e293b",
                              stroke: "white",
                              strokeWidth: 3,
                              paintOrder: "stroke",
                            }}
                          >
                            {node.name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Individual route sections */}
          {selectedRouteNames.map((routeName, index) => {
            const routeStops = routes[routeName];
            if (!routeStops) return null;

            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

            return (
              <div
                key={routeName}
                className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/60 dark:to-slate-800/40 p-6 shadow-sm dark:border-slate-700"
              >
                <div className="mb-6 flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full shadow-md ring-4 ring-white dark:ring-slate-900 flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {routeName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {routeStops.length} stops · Transit sequence view
                    </p>
                  </div>
                </div>

                <div className="relative overflow-x-auto pb-4">
                  <div className="relative flex min-w-max gap-4 px-4 pt-2">
                  <div
                    className="absolute left-6 right-6 top-8.5 h-1 rounded-full opacity-20"
                    style={{ backgroundColor: color }}
                  />
                    {routeStops.map((stop, stopIndex) => {
                      const isEndpoint =
                        stopIndex === 0 || stopIndex === routeStops.length - 1;

                      return (
                        <div
                          key={`${stop.route_name}-${stop.stop_sequence}`}
                          className="flex min-w-[10rem] flex-col items-center"
                        >
                          <div className="flex h-14 items-center justify-center">
                            <span
                              className={`rounded-full border-4 border-white shadow-md dark:border-slate-900 transition-all ${
                                isEndpoint ? "h-5 w-5" : "h-4 w-4"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          </div>
                          <div className="w-full text-center">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                              Stop {stop.stop_sequence}
                            </div>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-800/40 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm">
                              {stop.stop_name}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
