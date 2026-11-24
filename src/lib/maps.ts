import type { BusRoute, Coordinate, RouteId } from "./routes";
import { distanceMeters } from "./tracking";

export type RoadGeometry = {
  routeId: RouteId;
  path: Coordinate[];
  cumulative: number[];
  pointPositions: (Coordinate | null)[];
  pointDistances: (number | null)[];
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
    g.cumulative.length === g.path.length &&
    g.cumulative[0] === 0 &&
    g.cumulative.every(
      (v, i, a) => Number.isFinite(v) && v >= 0 && (i === 0 || v >= a[i - 1]),
    ) &&
    Math.abs(g.cumulative.at(-1)! - g.totalMeters) < 1 &&
    g.pointPositions.length === count &&
    g.pointPositions.every((p, i) =>
      p === null
        ? g.pointDistances[i] === null
        : g.pointDistances[i] !== null && inArequipa(p),
    ) &&
    g.pointDistances.length === count &&
    g.pointDistances
      .filter((v): v is number => v !== null)
      .every(
        (v, i, values) =>
          Number.isFinite(v) &&
          v >= 0 &&
          v <= g.totalMeters &&
          (i === 0 || v >= values[i - 1]),
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
  const distance = geometry.pointDistances[selected];
  if (distance === null || distance === undefined) return null;
  const target = distance / geometry.totalMeters;
  return progress > target + 0.003
    ? null
    : Math.max(0, Math.ceil((target - progress) * route.duration));
}
