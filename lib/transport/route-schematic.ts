import { RouteStops } from "@/types/transport";

export const ROUTE_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
  "#6366f1",
  "#e11d48",
];

export type SchematicPoint = {
  stationKey: string;
  x: number;
  y: number;
};

export type SchematicNode = {
  stationKey: string;
  name: string;
  routeCount: number;
  routeIndices: number[];
};

export type SchematicRoutePath = {
  routeName: string;
  points: SchematicPoint[];
};

export type SchematicNetwork = {
  width: number;
  height: number;
  nodes: SchematicNode[];
  nodePositions: Map<
    string,
    { x: number; y: number; routeCount: number; name: string }
  >;
  routePaths: SchematicRoutePath[];
};

function normalizeStationName(name: string) {
  return name.trim().toLowerCase();
}

function getRankedPositions(
  values: number[],
  {
    descending = false,
    padding,
    canvasSize,
  }: { descending?: boolean; padding: number; canvasSize: number },
) {
  const rankedValues = Array.from(new Set(values)).sort((a, b) =>
    descending ? b - a : a - b,
  );

  const positions = new Map<number, number>();

  rankedValues.forEach((value, index) => {
    const ratio =
      rankedValues.length === 1 ? 0.5 : index / (rankedValues.length - 1);
    positions.set(value, padding + ratio * canvasSize);
  });

  return positions;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function perpVec(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { nx: number; ny: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  return len < 0.001 ? { nx: 0, ny: 1 } : { nx: -dy / len, ny: dx / len };
}

// Builds the interior waypoints for a segment with a parallel lane offset.
// The route diverges from the canonical start to its lane position, runs
// 45°-constrained to near the end, then converges back to canonical end.
function buildOffsetSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ox: number,
  oy: number,
): Array<{ x: number; y: number }> {
  const CONV = 0.15; // fraction of segment used for convergence at each end
  const dx = bx - ax;
  const dy = by - ay;

  // Where the lane diverges/converges
  const sX = ax + CONV * dx + ox;
  const sY = ay + CONV * dy + oy;
  const eX = bx - CONV * dx + ox;
  const eY = by - CONV * dy + oy;

  // 45°-snap the middle lane section
  const mdx = eX - sX;
  const mdy = eY - sY;
  const absMdx = Math.abs(mdx);
  const absMdy = Math.abs(mdy);

  const result: Array<{ x: number; y: number }> = [{ x: sX, y: sY }];

  if (absMdx > 0.5 && absMdy > 0.5 && Math.abs(absMdx - absMdy) > 0.5) {
    const diagLen = Math.min(absMdx, absMdy);
    result.push({
      x: sX + Math.sign(mdx) * diagLen,
      y: sY + Math.sign(mdy) * diagLen,
    });
  }

  result.push({ x: eX, y: eY });
  return result;
}

const LANE_SPACING = 9;

export function buildSchematicNetwork(
  routes: RouteStops,
  selectedRouteNames: string[],
): SchematicNetwork | null {
  if (selectedRouteNames.length === 0) return null;

  const selectedRouteEntries = selectedRouteNames
    .map((routeName) => [routeName, routes[routeName]] as const)
    .filter((entry) => Boolean(entry[1]));

  if (selectedRouteEntries.length === 0) return null;

  const stationMap = new Map<
    string,
    {
      name: string;
      latitude: number;
      longitude: number;
      routes: Set<string>;
    }
  >();

  selectedRouteEntries.forEach(([routeName, routeStops]) => {
    routeStops.forEach((stop) => {
      const stationKey = normalizeStationName(stop.stop_name);
      const existing = stationMap.get(stationKey);
      if (existing) {
        existing.routes.add(routeName);
        return;
      }
      stationMap.set(stationKey, {
        name: stop.stop_name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        routes: new Set([routeName]),
      });
    });
  });

  const stations = Array.from(stationMap.entries());

  const width = 1200;
  const height = 800;
  const padding = 80;
  const canvasWidth = width - padding * 2;
  const canvasHeight = height - padding * 2;

  const xPositions = getRankedPositions(
    stations.map(([, s]) => s.longitude),
    { padding, canvasSize: canvasWidth },
  );
  const yPositions = getRankedPositions(
    stations.map(([, s]) => s.latitude),
    { descending: true, padding, canvasSize: canvasHeight },
  );

  const nodePositions = new Map<
    string,
    { x: number; y: number; routeCount: number; name: string }
  >();

  stations.forEach(([stationKey, station]) => {
    nodePositions.set(stationKey, {
      x: xPositions.get(station.longitude) ?? padding + canvasWidth / 2,
      y: yPositions.get(station.latitude) ?? padding + canvasHeight / 2,
      routeCount: station.routes.size,
      name: station.name,
    });
  });

  // Build edge usage: edgeKey -> ordered list of route indices
  const edgeUsage = new Map<string, number[]>();
  selectedRouteEntries.forEach(([, routeStops], routeIdx) => {
    const keys: string[] = [];
    routeStops.forEach((stop) => {
      const k = normalizeStationName(stop.stop_name);
      if (keys[keys.length - 1] !== k) keys.push(k);
    });
    for (let i = 0; i < keys.length - 1; i++) {
      const ek = edgeKey(keys[i], keys[i + 1]);
      const arr = edgeUsage.get(ek) ?? [];
      if (!arr.includes(routeIdx)) arr.push(routeIdx);
      edgeUsage.set(ek, arr);
    }
  });

  const routeNameToIndex = new Map(
    selectedRouteNames.map((name, i) => [name, i]),
  );

  const nodes = Array.from(stationMap.entries()).map(
    ([stationKey, station]) => ({
      stationKey,
      name: station.name,
      routeCount: station.routes.size,
      routeIndices: Array.from(station.routes)
        .map((name) => routeNameToIndex.get(name) ?? 0)
        .sort((a, b) => a - b),
    }),
  );

  const routePaths = selectedRouteEntries.map(([routeName, routeStops], routeIdx) => {
    const stationKeys: string[] = [];
    routeStops.forEach((stop) => {
      const k = normalizeStationName(stop.stop_name);
      if (stationKeys[stationKeys.length - 1] !== k) stationKeys.push(k);
    });

    if (stationKeys.length === 0) return { routeName, points: [] as SchematicPoint[] };

    const firstNode = nodePositions.get(stationKeys[0]);
    if (!firstNode) return { routeName, points: [] as SchematicPoint[] };

    const points: SchematicPoint[] = [
      { stationKey: stationKeys[0], x: firstNode.x, y: firstNode.y },
    ];

    for (let i = 1; i < stationKeys.length; i++) {
      const prevKey = stationKeys[i - 1];
      const currKey = stationKeys[i];
      const prevNode = nodePositions.get(prevKey);
      const currNode = nodePositions.get(currKey);
      if (!prevNode || !currNode) continue;

      const ek = edgeKey(prevKey, currKey);
      const routesOnEdge = edgeUsage.get(ek) ?? [routeIdx];
      const rank = routesOnEdge.indexOf(routeIdx);
      const mag = (rank - (routesOnEdge.length - 1) / 2) * LANE_SPACING;
      const { nx, ny } = perpVec(prevNode.x, prevNode.y, currNode.x, currNode.y);

      const interior = buildOffsetSegment(
        prevNode.x, prevNode.y,
        currNode.x, currNode.y,
        nx * mag, ny * mag,
      );

      interior.forEach((p) =>
        points.push({ stationKey: "__bend__", x: p.x, y: p.y }),
      );

      points.push({ stationKey: currKey, x: currNode.x, y: currNode.y });
    }

    return { routeName, points };
  });

  return { width, height, nodes, nodePositions, routePaths };
}
