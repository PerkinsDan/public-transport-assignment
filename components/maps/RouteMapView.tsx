import { MapContainer, Marker, Popup, Polyline, TileLayer } from "react-leaflet";

type RouteStop = {
  route_name: string;
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_sequence: number;
};

type RouteMapViewProps = {
  allPositions: [number, number][];
  routes: Record<string, RouteStop[]>;
  selectedRoutes: Set<string>;
  routeLines: Record<string, [number, number][] >;
  snappedStops: Record<string, [number, number][] >;
  routeColors: string[];
};

export default function RouteMapView({
  allPositions,
  routes,
  selectedRoutes,
  routeLines,
  snappedStops,
  routeColors,
}: RouteMapViewProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
      <div className="h-[520px] overflow-hidden">
        <MapContainer
          center={allPositions[0] ?? [51.5072, -0.1276]}
          zoom={12}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {Object.entries(routes).map(([routeName, routeStops], index) => {
            if (!selectedRoutes.has(routeName)) {
              return null;
            }

            const color = routeColors[index % routeColors.length];

            const fallbackPositions = routeStops.map((stop) => [
              stop.latitude,
              stop.longitude,
            ]) as [number, number][];

            return (
              <div key={routeName}>
                {routeStops.map((stop, stopIndex) => (
                  <Marker
                    key={`${stop.route_name}-${stop.stop_sequence}-${stopIndex}`}
                    position={
                      snappedStops[routeName]?.[stopIndex] ?? [stop.latitude, stop.longitude]
                    }
                  >
                    <Popup>
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900">{stop.stop_name}</div>
                        <div className="text-xs text-slate-600">
                          <div>Route: {stop.route_name}</div>
                          <div>Stop #{stop.stop_sequence}</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                <Polyline
                  positions={routeLines[routeName] ?? fallbackPositions}
                  pathOptions={{ color, weight: 5, opacity: 0.8 }}
                />
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}