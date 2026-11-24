import { test } from "node:test";
import assert from "node:assert/strict";
import { routes } from "../src/lib/routes";
import {
  arrivalTime,
  crossedThreshold,
  demoEta,
  distanceMeters,
  isFresh,
  occupancyLabel,
  parseTelemetry,
} from "../src/lib/tracking";

test("Las cuatro láminas conservan sus 75 referencias y horarios", () => {
  assert.equal(
    routes.reduce((total, route) => total + route.points.length, 0),
    75,
  );
  assert.deepEqual(
    routes.map((r) => [r.id, r.departure, r.arrival, r.duration]),
    [
      ["norte", "06:00", "06:50", 50],
      ["sur", "06:05", "06:45", 40],
      ["este", "05:50", "06:50", 60],
      ["oeste", "05:50", "06:55", 65],
    ],
  );
  for (const route of routes) {
    assert.ok(
      route.points.every(
        (point) => point.coordinate === null && !point.boardingVerified,
      ),
    );
    assert.equal(route.points.at(-1)?.name, "Av. San Jerónimo");
    assert.equal(
      new Set(route.points.map((p) => p.id)).size,
      route.points.length,
    );
  }
});
test("No se muestra un ETA para una referencia que el bus ya pasó", () => {
  assert.equal(demoEta(routes[0], 0.8, 1), null);
  assert.equal(demoEta(routes[0], 0.5, 18), 25);
});
test("Una alerta se genera al cruzar el umbral, nunca en cada actualización", () => {
  assert.equal(crossedThreshold(6, 5, 5), true);
  assert.equal(crossedThreshold(5, 5, 5), false);
  assert.equal(crossedThreshold(null, 4, 5), false);
  assert.equal(crossedThreshold(1, 0, 0), true);
  assert.equal(crossedThreshold(1, null, 0), false);
});
test("GPS viejo, futuro o inválido no es reciente", () => {
  assert.equal(isFresh(100000, 120000), true);
  assert.equal(isFresh(100000, 160000), false);
  assert.equal(isFresh(200000, 100000), false);
  assert.equal(isFresh(NaN, 100000), false);
});
test("Valida coordenadas, velocidad, ruta y ETA sin convertir strings", () => {
  const valid = {
    routeId: "norte",
    vehicleId: "BUS-01",
    latitude: -16.4,
    longitude: -71.5,
    speedKmh: 25,
    updatedAt: 100000,
    occupancy: 10,
    capacity: 50,
    etaMinutes: 5,
    targetPointId: "norte-19",
  };
  assert.equal(parseTelemetry(valid, "norte")?.etaMinutes, 5);
  assert.equal(parseTelemetry({ ...valid, latitude: 99 }, "norte"), null);
  assert.equal(parseTelemetry({ ...valid, speedKmh: "20" }, "norte"), null);
  assert.equal(parseTelemetry(valid, "sur"), null);
  assert.equal(
    parseTelemetry({ ...valid, etaMinutes: -5 }, "norte")?.etaMinutes,
    null,
  );
  assert.equal(
    parseTelemetry({ ...valid, occupancy: -10 }, "norte")?.occupancy,
    null,
  );
});
test("Aforo respeta capacidad faltante y ocupación límite", () => {
  assert.equal(occupancyLabel(null, 50), "Sin datos");
  assert.equal(occupancyLabel(0, 0), "Sin datos");
  assert.equal(occupancyLabel(0, 50), "Bajo");
  assert.equal(occupancyLabel(25, 50), "Medio");
  assert.equal(occupancyLabel(45, 50), "Lleno");
});
test("Hora de llegada usa Lima y cruza medianoche", () => {
  assert.equal(arrivalTime(5, Date.parse("2026-11-24T04:58:00Z")), "00:03");
  assert.equal(arrivalTime(null, 0), "—");
});
test("Distancia de geocerca es cero en el mismo lugar y simétrica", () => {
  const a = { lat: -16.4, lng: -71.5 },
    b = { lat: -16.41, lng: -71.51 };
  assert.equal(distanceMeters(a, a), 0);
  assert.ok(distanceMeters(a, b) > 1000);
  assert.equal(
    Math.round(distanceMeters(a, b)),
    Math.round(distanceMeters(b, a)),
  );
});
