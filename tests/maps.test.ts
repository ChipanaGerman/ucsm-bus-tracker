import { readFileSync } from "node:fs";
import { distanceMeters } from "../src/lib/tracking";
import { demoProgress } from "../src/lib/tracking";
import { test } from "node:test";
import assert from "node:assert/strict";
import { routes } from "../src/lib/routes";
import {
  inArequipa,
  pathLengths,
  positionOnRoad,
  roadDemoEta,
  validateRoadGeometry,
  type RoadGeometry,
} from "../src/lib/maps";

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
test("Sin geometría vial no se inventa un ETA ni se reutiliza otra ruta", () => {
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

test("Los cuatro trazados publicados son continuos, locales y respetan referencias desconocidas", () => {
  const references = JSON.parse(
    readFileSync("data/route-waypoints.json", "utf8"),
  );
  let resolved = 0,
    count = 0;
  for (const route of routes) {
    const geometry = JSON.parse(
      readFileSync(`public/map-routes/${route.id}.json`, "utf8"),
    ) as RoadGeometry;
    assert.equal(geometry.routeId, route.id);
    assert.equal(validateRoadGeometry(geometry, route.points.length), true);
    const source = references.routes[route.id];
    assert.equal(source.length, route.points.length);
    geometry.path.forEach((p, i) => {
      if (i)
        assert.ok(
          distanceMeters(geometry.path[i - 1], p) < 750,
          "Detectar saltos desproporcionados; una avenida recta puede superar 250 m",
        );
    });
    source.forEach(
      (
        reference: { name: string; coordinate: unknown; osm: string | null },
        i: number,
      ) => {
        count++;
        assert.equal(reference.name, route.points[i].name);
        if (!reference.coordinate) {
          assert.equal(geometry.pointPositions[i], null);
          assert.equal(geometry.pointDistances[i], null);
          assert.equal(roadDemoEta(route, geometry, 0, i), null);
        } else {
          resolved++;
          assert.match(
            reference.osm!,
            /^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/,
          );
          const position = positionOnRoad(
            geometry.path,
            geometry.cumulative,
            geometry.pointDistances[i]!,
          )!;
          assert.ok(
            distanceMeters(position, geometry.pointPositions[i]!) < 15,
            "La referencia debe estar sobre la polilínea",
          );
        }
      },
    );
  }
  assert.equal(count, 75);
  assert.equal(resolved, 70);
});

test("Norte y Este conservan las referencias revisadas en el corredor correcto", () => {
  const north = JSON.parse(
    readFileSync("public/map-routes/norte.json", "utf8"),
  ) as RoadGeometry;
  const east = JSON.parse(
    readFileSync("public/map-routes/este.json", "utf8"),
  ) as RoadGeometry;
  // Regression: the earlier matches sent Norte to Aviación in northern Cayma
  // and Este to Tupacamaru in Miraflores, creating kilometer-long excursions.
  const aviation = north.pointPositions[5]!;
  assert.ok(aviation.lat > -16.356 && aviation.lat < -16.35);
  assert.ok(aviation.lng > -71.56 && aviation.lng < -71.55);
  const tupac = east.pointPositions[1]!;
  assert.ok(tupac.lat > -16.416 && tupac.lat < -16.413);
  assert.ok(tupac.lng > -71.506 && tupac.lng < -71.502);
  const references = JSON.parse(readFileSync("data/route-waypoints.json", "utf8"));
  assert.match(references.routes.este[7].osmName, /Mariscal Castilla/);
  assert.ok(north.totalMeters < 14000);
  assert.ok(east.totalMeters < 14000);
  for (const route of routes) {
    const value = JSON.parse(
      readFileSync(`public/map-routes/${route.id}.json`, "utf8"),
    );
    assert.ok(
      value.provenance.snappingMeters.every(
        (distance: number) => distance <= 80,
      ),
    );
  }
});

test("La reproducción avanza un minuto de recorrido por un minuto transcurrido", () => {
  for (const route of routes) {
    const elapsed = demoProgress(route, 30) - demoProgress(route, 0);
    assert.ok(Math.abs(elapsed - 1 / route.duration) < 1e-10);
    assert.ok(
      Math.abs(
        demoProgress(route, route.duration * 30) - demoProgress(route, 0),
      ) < 1e-10,
    );
  }
});
