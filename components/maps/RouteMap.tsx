"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import RouteMapView from "@/components/maps/RouteMapView";
import RouteSchematicView from "@/components/maps/RouteSchematicView";
import { ROUTE_COLORS } from "@/lib/transport/route-schematic";
import { groupAndSortStops } from "@/lib/transport/route-utils";
import { RouteStops, StopPoint } from "@/types/transport";

function initializeLeaflet() {
  if (typeof window === "undefined") return;

  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

interface RouteMapProps {
  data: StopPoint[];
}

export default function RouteMap({ data }: RouteMapProps) {
  const [viewMode, setViewMode] = useState<"map" | "schematic">("map");
  const [routeLines, setRouteLines] = useState<
    Record<string, [number, number][]>
  >({});
  const [snappedStops, setSnappedStops] = useState<
    Record<string, [number, number][]>
  >({});
  const routes: RouteStops = useMemo(() => groupAndSortStops(data), [data]);

  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(
    () => new Set(data.map((stop) => stop.route_name)),
  );

  useEffect(() => {
    setSelectedRoutes(new Set(data.map((stop) => stop.route_name)));
  }, [data]);

  const handleRouteToggle = (routeName: string) => {
    const newSelected = new Set(selectedRoutes);

    if (newSelected.has(routeName)) {
      newSelected.delete(routeName);
    } else {
      newSelected.add(routeName);
    }

    setSelectedRoutes(newSelected);
  };

  useEffect(() => {
    initializeLeaflet();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRoutes() {
      const routedLines: Record<string, [number, number][]> = {};
      const snappedMarkers: Record<string, [number, number][]> = {};

      for (const [routeName, routeStops] of Object.entries(routes)) {
        if (routeStops.length < 2) continue;

        const coordinates = routeStops
          .map((stop) => `${stop.longitude},${stop.latitude}`)
          .join(";");

        const fallbackPositions = routeStops.map((stop) => [
          stop.latitude,
          stop.longitude,
        ]) as [number, number][];

        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
            { signal: controller.signal },
          );

          const json = await res.json();

          if (!json.routes?.[0]?.geometry?.coordinates) {
            routedLines[routeName] = fallbackPositions;
            snappedMarkers[routeName] = fallbackPositions;
            continue;
          }

          routedLines[routeName] = json.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng],
          );

          snappedMarkers[routeName] = json.waypoints.map((waypoint: { location: [number, number] }) => {
            const [lng, lat] = waypoint.location;
            return [lat, lng] as [number, number];
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          routedLines[routeName] = fallbackPositions;
          snappedMarkers[routeName] = fallbackPositions;
        }
      }

      setRouteLines(routedLines);
      setSnappedStops(snappedMarkers);
    }

    fetchRoutes();
    return () => controller.abort();
  }, [routes]);

  if (data.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Route Stop Map</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No route data available. Check that the <code>get_route_map</code> RPC exists in Supabase and data has been imported.
        </p>
      </section>
    );
  }

  const allPositions = data.map((stop) => [stop.latitude, stop.longitude]) as [
    number,
    number,
  ][];

  const selectedRouteNames = Object.keys(routes).filter((routeName) =>
    selectedRoutes.has(routeName),
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 sm:mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Route Stop Map
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Switch between the geographic map and a schematic line view.
          </p>
        </div>

        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${viewMode === "map" ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setViewMode("schematic")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${viewMode === "schematic" ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
          >
            Schematic
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <RouteMapView
          allPositions={allPositions}
          routes={routes}
          selectedRoutes={selectedRoutes}
          routeLines={routeLines}
          snappedStops={snappedStops}
          routeColors={ROUTE_COLORS}
        />
      ) : (
        <RouteSchematicView
          routes={routes}
          selectedRouteNames={selectedRouteNames}
        />
      )}

      <div className="mt-4 sm:mt-6">
        <p className="mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
          Click routes to toggle visibility
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-5">
          {Object.keys(routes).map((routeName, index) => {
            const isSelected = selectedRoutes.has(routeName);

            return (
              <button
                key={routeName}
                onClick={() => handleRouteToggle(routeName)}
                className={`cursor-pointer rounded-lg border p-2 sm:p-3 text-left transition-all ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30"
                    : "border-slate-200 bg-slate-50 opacity-60 hover:opacity-80 dark:border-slate-600 dark:bg-slate-700/50"
                }`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 rounded-full ${isSelected ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                  style={{ backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }}
                />
                <span
                  className={`ml-1.5 sm:ml-2 truncate text-xs sm:text-sm font-medium ${
                    isSelected
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {routeName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}