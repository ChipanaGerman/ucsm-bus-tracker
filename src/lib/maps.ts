import type { BusRoute, Coordinate, RouteId } from "./routes";
import { distanceMeters } from "./tracking";

// Textos para resolver las vías en Arequipa; no certifican puntos de abordaje.
const localities: Record<RouteId, string[]> = {
  norte: [
    "Cayma",
    "Cayma",
    "Cayma",
    "Cerro Colorado",
    "Cerro Colorado",
    "Cerro Colorado",
    "Cerro Colorado",
    "Cerro Colorado",
    "Cerro Colorado",
    "Cerro Colorado",
    "Yanahuara",
    "Cayma",
    "Cayma",
    "Yanahuara",
    "Umacollo",
    "Umacollo",
    "Umacollo",
    "Umacollo",
    "Umacollo",
  ],
  sur: [
    "Paucarpata",
    "Paucarpata",
    "José Luis Bustamante y Rivero",
    "José Luis Bustamante y Rivero",
    "José Luis Bustamante y Rivero",
    "José Luis Bustamante y Rivero",
    "Arequipa",
    "Arequipa",
    "Vallecito",
    "Vallecito",
    "Vallecito",
    "Arequipa",
    "Umacollo",
    "Umacollo",
    "Umacollo",
  ],
  este: [
    "Paucarpata",
    "Mariano Melgar",
    "Mariano Melgar",
    "Mariano Melgar",
    "Mariano Melgar",
    "Miraflores",
    "Miraflores",
    "Miraflores",
    "Arequipa",
    "Arequipa",
    "Arequipa",
    "Arequipa",
    "Yanahuara",
    "Yanahuara",
    "Umacollo",
    "Umacollo",
  ],
  oeste: [
    "José Luis Bustamante y Rivero",
    "Socabaya",
    "Socabaya",
    "Hunter",
    "Hunter",
    "Hunter",
    "Hunter",
    "Hunter",
    "Hunter",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Sachaca",
    "Umacollo",
    "Umacollo",
    "Umacollo",
    "Umacollo",
    "Umacollo",
  ],
};
export function routeAddresses(route: BusRoute): string[] {
  return route.points.map(
    (point, index) =>
      `${point.name.replace(/\s*\([^)]*\)/g, "")}, ${localities[route.id][index]}, Arequipa, Perú`,
  );
}
export type RoadGeometry = {
  routeId: RouteId;
  path: Coordinate[];
  cumulative: number[];
  pointPositions: Coordinate[];
  pointDistances: number[];
  totalMeters: number;
};
export function inArequipa(point: Coordinate): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat > -16.58 &&
    point.lat < -16.23 &&
    point.lng > -71.73 &&
    point.lng < -71.36
  );
}
export function pathLengths(path: Coordinate[]): number[] {
  const cumulative = [0];
  for (let i = 1; i < path.length; i++)
    cumulative.push(cumulative[i - 1] + distanceMeters(path[i - 1], path[i]));
  return cumulative;
}
export function positionOnRoad(
  path: Coordinate[],
  cumulative: number[],
  distance: number,
): Coordinate | null {
  if (path.length < 2 || cumulative.length !== path.length) return null;
  const target = Math.max(
    0,
    Math.min(distance, cumulative[cumulative.length - 1]),
  );
  let low = 0,
    high = cumulative.length - 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (cumulative[mid] < target) low = mid + 1;
    else high = mid;
  }
  const index = Math.max(1, low),
    a = path[index - 1],
    b = path[index];
  const fraction =
    (target - cumulative[index - 1]) /
    Math.max(1, cumulative[index] - cumulative[index - 1]);
  return {
    lat: a.lat + (b.lat - a.lat) * fraction,
    lng: a.lng + (b.lng - a.lng) * fraction,
  };
}
export function validateRoadGeometry(g: RoadGeometry, count: number): boolean {
  return (
    g.path.length >= 2 &&
    g.path.every(inArequipa) &&
    g.pointPositions.length === count &&
    g.pointPositions.every(inArequipa) &&
    g.pointDistances.length === count &&
    g.pointDistances.every(
      (v, i, values) =>
        Number.isFinite(v) && v >= 0 && (i === 0 || v >= values[i - 1]),
    ) &&
    g.totalMeters > 100 &&
    g.totalMeters < 100000
  );
}
export function roadDemoEta(
  route: BusRoute,
  geometry: RoadGeometry | null,
  progress: number,
  selected: number,
): number | null {
  if (!geometry || geometry.routeId !== route.id || !geometry.totalMeters)
    return null;
  const target = geometry.pointDistances[selected] / geometry.totalMeters;
  return progress > target + 0.003
    ? null
    : Math.max(0, Math.ceil((target - progress) * route.duration));
}
