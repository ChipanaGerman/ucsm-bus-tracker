import { test } from "node:test";
import assert from "node:assert/strict";
import { routes } from "../src/lib/routes";
import {
  inArequipa,
  pathLengths,
  positionOnRoad,
  roadDemoEta,
  routeAddresses,
  validateRoadGeometry,
  type RoadGeometry,
} from "../src/lib/maps";

test("Las solicitudes conservan las 75 referencias y las sitúan en Arequipa", () => {
  for (const route of routes) {
    const addresses = routeAddresses(route);
    assert.equal(addresses.length, route.points.length);
    assert.ok(
      addresses.every(
        (address) =>
          address.endsWith("Arequipa, Perú") && !address.includes("undefined"),
      ),
    );
    assert.ok(addresses[0].startsWith(route.points[0].name.split(" (")[0]));
    assert.ok(addresses.at(-1)?.startsWith("Av. San Jerónimo"));
    assert.ok(addresses.length - 2 <= 25);
  }
});
test("El bus recorre las esquinas de la polilínea, no la diagonal", () => {
  const path = [
    { lat: -16.4, lng: -71.54 },
    { lat: -16.4, lng: -71.53 },
    { lat: -16.39, lng: -71.53 },
  ];
  const lengths = pathLengths(path);
  const beforeCorner = positionOnRoad(path, lengths, lengths[1] / 2)!;
  const afterCorner = positionOnRoad(
    path,
    lengths,
    lengths[1] + (lengths[2] - lengths[1]) / 2,
  )!;
  assert.equal(beforeCorner.lat, path[0].lat);
  assert.equal(afterCorner.lng, path[1].lng);
  assert.deepEqual(positionOnRoad(path, lengths, -100), path[0]);
  assert.deepEqual(positionOnRoad(path, lengths, lengths[2] + 1000), path[2]);
});
test("No se dibuja una referencia resuelta en otra ciudad", () => {
  assert.equal(inArequipa({ lat: -12.046, lng: -77.04 }), false);
  assert.equal(inArequipa({ lat: -16.4, lng: -71.54 }), true);
  const path = [
    { lat: -16.4, lng: -71.54 },
    { lat: -16.39, lng: -71.53 },
  ];
  const cumulative = pathLengths(path);
  const value: RoadGeometry = {
    routeId: "norte",
    path,
    cumulative,
    totalMeters: cumulative[1],
    pointPositions: path,
    pointDistances: [0, cumulative[1]],
  };
  assert.equal(validateRoadGeometry(value, 2), true);
  assert.equal(
    validateRoadGeometry(
      { ...value, pointPositions: [path[0], { lat: -12.046, lng: -77.04 }] },
      2,
    ),
    false,
  );
  assert.equal(
    validateRoadGeometry({ ...value, pointDistances: [500, 100] }, 2),
    false,
  );
  assert.equal(validateRoadGeometry(value, 19), false);
});
test("Sin geometría Google no se inventa un ETA ni se reutiliza otra ruta", () => {
  assert.equal(roadDemoEta(routes[0], null, 0.4, 10), null);
  const value: RoadGeometry = {
    routeId: "sur",
    path: [],
    cumulative: [],
    totalMeters: 5000,
    pointPositions: [],
    pointDistances: [0, 5000],
  };
  assert.equal(roadDemoEta(routes[0], value, 0.4, 1), null);
  assert.equal(roadDemoEta(routes[1], value, 0.4, 1), 24);
});
