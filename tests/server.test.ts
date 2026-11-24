import { test } from "node:test";
import assert from "node:assert/strict";
import { combineEta, notificationEvents, validateSample, verifiedRoutePoints } from "../functions/core.mjs";

test("Servidor rechaza estudiantes como emisor, rutas ajenas y muestras antiguas", () => {
  const sample = { routeId: "norte", vehicleId: "BUS_01", tripId: "viaje_1", latitude: -16.4, longitude: -71.5, speedKmh: 20, sampledAt: 100000, sequence: 1, nextPointIndex: 0 };
  const claims = { device: true, vehicleId: "BUS_01", allowedRouteIds: ["norte"] };
  assert.equal(validateSample(sample, claims, 100000).routeId, "norte");
  assert.throws(() => validateSample(sample, { email: "alumno@ucsm.edu.pe" }, 100000));
  assert.throws(() => validateSample({ ...sample, routeId: "sur" }, claims, 100000));
  assert.throws(() => validateSample(sample, claims, 200000));
  assert.throws(() => validateSample({ ...sample, occupancy: 55, capacity: 50 }, claims, 100000));
});
test("ETA real no usa geometría esquemática ni datos históricos insuficientes", () => {
  assert.equal(verifiedRoutePoints([{ id: "norte-1", lat: 0, lng: 0 }], "norte"), null);
  assert.equal(combineEta(600, { samples: 2, seconds: 2000 }, 20, 1000), 10);
  assert.equal(combineEta(600, { samples: 10, seconds: 1200 }, 20, 1000), 12);
  assert.equal(combineEta(-5, null, 20, 1000), null);
});
test("Servidor genera proximidad una vez al cruzar umbral y respeta preferencias", () => {
  const previous = { tripId: "viaje1", etas: { "norte-19": 6 }, status: "normal" };
  const sample = { routeId: "norte", tripId: "viaje1", updatedAt: 100000, etas: { "norte-19": 5 }, status: "normal" };
  const prefs = { alerts: true, routeId: "norte", habitualPointId: "norte-19", threshold: 5 };
  assert.deepEqual(notificationEvents(previous, sample, prefs, null, 100000), ["proximity"]);
  assert.deepEqual(notificationEvents(sample, sample, prefs, null, 100000), []);
  assert.deepEqual(notificationEvents(previous, sample, { ...prefs, alerts: false }, null, 100000), []);
  assert.deepEqual(notificationEvents(previous, sample, prefs, null, 200000), []);
  assert.deepEqual(notificationEvents(previous, { ...sample, tripId: "viaje2" }, prefs, null, 100000), []);
});
