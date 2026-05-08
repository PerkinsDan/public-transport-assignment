import { StopPoint, RouteStops } from "@/types/transport";

export function groupAndSortStops(stops: StopPoint[]): RouteStops {
  const grouped: RouteStops = {};

  stops.forEach((stop) => {
    if (!grouped[stop.route_name]) {
      grouped[stop.route_name] = [];
    }
    grouped[stop.route_name].push(stop);
  });

  Object.values(grouped).forEach((routeStops) => {
    routeStops.sort((a, b) => a.stop_sequence - b.stop_sequence);
  });

  return grouped;
}
