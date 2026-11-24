import type { BusRoute, Coordinate, RouteId } from "./routes";
export type Telemetry = {
  routeId: RouteId;
  vehicleId: string;
  updatedAt: number;
  latitude: number;
  longitude: number;
  speedKmh: number;
  occupancy: number | null;
  capacity: number | null;
  etaMinutes: number | null;
  targetPointId: string | null;
  etas: Record<string, number>;
  status: "normal" | "delay" | "diversion";
};
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function isFresh(updatedAt: number, now = Date.now()): boolean {
  return Number.isFinite(updatedAt) && now - updatedAt < 60000 && now - updatedAt >= -10000;
}
export function occupancyLabel(occupancy: number | null, capacity: number | null) {
  if (occupancy === null || capacity === null || capacity <= 0) return "Sin datos";
  return occupancy / capacity >= .9 ? "Lleno" : occupancy / capacity >= .5 ? "Medio" : "Bajo";
}
export function parseTelemetry(value: unknown, routeId: RouteId): Telemetry | null {
  if (!value || typeof value !== "object") return null;
  const t = value as Record<string, unknown>;
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  if (t.routeId !== routeId || typeof t.vehicleId !== "string" || !finite(t.latitude) || !finite(t.longitude) || !finite(t.updatedAt) || !finite(t.speedKmh)) return null;
  if (Math.abs(t.latitude) > 90 || Math.abs(t.longitude) > 180 || t.speedKmh < 0 || t.speedKmh > 160) return null;
  const occupancy = finite(t.occupancy) && t.occupancy >= 0 ? t.occupancy : null;
  const capacity = finite(t.capacity) && t.capacity > 0 ? t.capacity : null;
  const etas: Record<string, number> = {};
  if (t.etas && typeof t.etas === "object") for (const [key, value] of Object.entries(t.etas)) {
    if (key.startsWith(`${routeId}-`) && finite(value) && value >= 0 && value <= 1440) etas[key] = value;
  }
  if (capacity !== null && occupancy !== null && occupancy > capacity) return null;
  return { routeId, vehicleId: t.vehicleId, latitude: t.latitude, longitude: t.longitude, updatedAt: t.updatedAt, speedKmh: t.speedKmh, occupancy, capacity, etas,
    etaMinutes: finite(t.etaMinutes) && t.etaMinutes >= 0 ? t.etaMinutes : null,
    targetPointId: typeof t.targetPointId === "string" ? t.targetPointId : null,
    status: t.status === "delay" || t.status === "diversion" ? t.status : "normal" };
}
export function demoProgress(route: BusRoute, tick: number): number {
  return ((route.id === "norte" ? .35 : route.id === "sur" ? .48 : .22) + tick * .004) % 1;
}
export function demoEta(route: BusRoute, progress: number, pointIndex: number): number | null {
  const target = pointIndex / (route.points.length - 1);
  if (progress > target + .005) return null;
  return Math.max(0, Math.ceil((target - progress) * route.duration));
}
export function arrivalTime(eta: number | null, now: number): string {
  if (eta === null) return "—";
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(now + eta * 60000));
}
export function crossedThreshold(previous: number | null, current: number | null, threshold: number): boolean {
  return previous !== null && current !== null && previous > threshold && current <= threshold;
}
