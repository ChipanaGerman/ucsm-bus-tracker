export const ROUTE_IDS = ["norte", "sur", "este", "oeste"];
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const identifier = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value);

export function validateSample(value, claims, now = Date.now()) {
  if (!claims?.device || !Array.isArray(claims.allowedRouteIds))
    throw new Error("device-permission");
  if (
    !value ||
    !ROUTE_IDS.includes(value.routeId) ||
    !claims.allowedRouteIds.includes(value.routeId)
  )
    throw new Error("route-permission");
  if (
    !identifier(value.vehicleId) ||
    value.vehicleId !== claims.vehicleId ||
    !identifier(value.tripId)
  )
    throw new Error("vehicle-or-trip");
  if (
    !finite(value.latitude) ||
    Math.abs(value.latitude) > 90 ||
    !finite(value.longitude) ||
    Math.abs(value.longitude) > 180
  )
    throw new Error("coordinates");
  if (!finite(value.speedKmh) || value.speedKmh < 0 || value.speedKmh > 160)
    throw new Error("speed");
  if (
    !finite(value.sampledAt) ||
    now - value.sampledAt > 60000 ||
    value.sampledAt - now > 10000
  )
    throw new Error("timestamp");
  if (
    !Number.isInteger(value.sequence) ||
    value.sequence < 0 ||
    !Number.isInteger(value.nextPointIndex) ||
    value.nextPointIndex < 0 ||
    value.nextPointIndex > 24
  )
    throw new Error("sequence-or-point");
  if (
    value.occupancy != null &&
    (!Number.isInteger(value.occupancy) ||
      value.occupancy < 0 ||
      value.occupancy > 200)
  )
    throw new Error("occupancy");
  if (
    value.capacity != null &&
    (!Number.isInteger(value.capacity) ||
      value.capacity < 1 ||
      value.capacity > 200)
  )
    throw new Error("capacity");
  if (
    value.occupancy != null &&
    value.capacity != null &&
    value.occupancy > value.capacity
  )
    throw new Error("over-capacity");
  return {
    routeId: value.routeId,
    vehicleId: value.vehicleId,
    tripId: value.tripId,
    latitude: value.latitude,
    longitude: value.longitude,
    speedKmh: value.speedKmh,
    sampledAt: value.sampledAt,
    updatedAt: now,
    sequence: value.sequence,
    nextPointIndex: value.nextPointIndex,
    occupancy: value.occupancy ?? null,
    capacity: value.capacity ?? null,
    status: ["normal", "delay", "diversion"].includes(value.status)
      ? value.status
      : "normal",
  };
}

export function meters(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function verifiedRoutePoints(points, routeId) {
  if (!Array.isArray(points) || !points.length || points.length > 25)
    return null;
  if (
    !points.every(
      (p, index) =>
        p?.id === `${routeId}-${index + 1}` &&
        p.coordinateVerified === true &&
        finite(p.lat) &&
        Math.abs(p.lat) <= 90 &&
        finite(p.lng) &&
        Math.abs(p.lng) <= 180,
    )
  )
    return null;
  return points;
}

// Google aporta la duración con tráfico. Los históricos se usan solo con >=10 viajes reales.
// La velocidad GPS influye únicamente en el último tramo (<300m), nunca en todo el recorrido.
export function combineEta(trafficSeconds, history, speedKmh, distanceToPoint) {
  if (!finite(trafficSeconds) || trafficSeconds < 0) return null;
  let seconds = trafficSeconds;
  if (
    history &&
    finite(history.seconds) &&
    history.seconds > 0 &&
    history.samples >= 10
  )
    seconds = 0.85 * seconds + 0.15 * history.seconds;
  if (distanceToPoint < 300 && speedKmh >= 5)
    seconds = 0.8 * seconds + (0.2 * distanceToPoint) / (speedKmh / 3.6);
  return Math.max(0, Math.ceil(seconds / 60));
}

export function notificationEvents(
  previous,
  sample,
  preferences,
  verifiedPoint,
  now = Date.now(),
) {
  if (
    !preferences?.alerts ||
    ![3, 5, 10].includes(preferences.threshold) ||
    preferences.routeId !== sample.routeId ||
    now - sample.updatedAt > 60000
  )
    return [];
  const id = preferences.habitualPointId;
  const currentEta = sample.etas?.[id],
    oldEta = previous?.tripId === sample.tripId ? previous?.etas?.[id] : null;
  const events = [];
  if (
    finite(currentEta) &&
    finite(oldEta) &&
    oldEta > preferences.threshold &&
    currentEta <= preferences.threshold
  )
    events.push("proximity");
  if (verifiedPoint?.boardingVerified && verifiedPoint.coordinateVerified) {
    const distance = meters(
      { lat: sample.latitude, lng: sample.longitude },
      verifiedPoint,
    );
    const previousDistance =
      previous?.tripId === sample.tripId
        ? meters(
            { lat: previous.latitude, lng: previous.longitude },
            verifiedPoint,
          )
        : null;
    if (previousDistance !== null && previousDistance > 100 && distance <= 100)
      events.push("arrival");
  }
  if (
    previous?.tripId === sample.tripId &&
    previous.status !== sample.status &&
    ["delay", "diversion"].includes(sample.status)
  )
    events.push(sample.status);
  return events;
}
