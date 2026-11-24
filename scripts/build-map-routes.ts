/** Run manually when reviewed reference coordinates change. Not part of build.
 * Four serial public OSRM requests; never query this service from visitors.
 * Public service policy: https://routing.openstreetmap.de/about.html (1 req/s).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { routes, type Coordinate, type RouteId } from "../src/lib/routes";
import {
  pathLengths,
  validateRoadGeometry,
  type RoadGeometry,
} from "../src/lib/maps";

type Reference = {
  name: string;
  coordinate: Coordinate | null;
  osm: string | null;
  status: string;
};
type Step = { geometry: { coordinates: [number, number][] } };
type OSRM = {
  code: string;
  routes: { legs: { steps: Step[] }[] }[];
  waypoints: { location: [number, number]; distance: number }[];
};
async function main() {
  const input = JSON.parse(
    await readFile("data/route-waypoints.json", "utf8"),
  ) as { routes: Record<RouteId, Reference[]> };
  await mkdir("public/map-routes", { recursive: true });
  for (const route of routes) {
    const references = input.routes[route.id];
    if (
      references.length !== route.points.length ||
      references.some((r, i) => r.name !== route.points[i].name)
    )
      throw new Error("References changed: review data first");
    const resolved = references.flatMap((r, index) =>
      r.coordinate ? [{ ...r, coordinate: r.coordinate, index }] : [],
    );
    const coordinates = resolved
      .map((r) => `${r.coordinate.lng},${r.coordinate.lat}`)
      .join(";");
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true&continue_straight=false&radiuses=${resolved.map(() => "350").join(";")}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "UCSMBusTracker/1.0 (academic; https://github.com/ChipanaGerman/ucsm-bus-tracker)",
      },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = (await response.json()) as OSRM;
    if (
      data.code !== "Ok" ||
      data.routes[0]?.legs.length !== resolved.length - 1 ||
      data.waypoints.length !== resolved.length
    )
      throw new Error(`Incomplete route ${route.id}`);
    const path: Coordinate[] = [],
      ends = [0];
    for (const leg of data.routes[0].legs) {
      for (const step of leg.steps)
        for (const [lng, lat] of step.geometry.coordinates) {
          if (path.at(-1)?.lat !== lat || path.at(-1)?.lng !== lng)
            path.push({ lat, lng });
        }
      ends.push(path.length - 1);
    }
    const cumulative = pathLengths(path);
    const pointPositions: (Coordinate | null)[] = references.map(() => null),
      pointDistances: (number | null)[] = references.map(() => null);
    resolved.forEach((r, i) => {
      const [lng, lat] = data.waypoints[i].location;
      pointPositions[r.index] = { lat, lng };
      pointDistances[r.index] = cumulative[ends[i]];
    });
    const geometry: RoadGeometry = {
      routeId: route.id,
      path,
      cumulative,
      pointPositions,
      pointDistances,
      totalMeters: cumulative.at(-1)!,
    };
    if (!validateRoadGeometry(geometry, references.length))
      throw new Error(`Invalid geometry ${route.id}`);
    await writeFile(
      `public/map-routes/${route.id}.json`,
      JSON.stringify({
        ...geometry,
        provenance: {
          generatedAt: new Date().toISOString(),
          routing:
            "OSRM / FOSSGIS, car profile; not a certified university bus route",
          data: "© OpenStreetMap contributors, ODbL 1.0",
          referenceSource: "data/route-waypoints.json",
          unresolved: references.flatMap((r, i) =>
            !r.coordinate ? [i + 1] : [],
          ),
        },
      }) + "\n",
    );
    console.log(
      `${route.id}: ${(geometry.totalMeters / 1000).toFixed(1)} km, ${resolved.length}/${references.length} approximate references, ${path.length} street vertices`,
    );
    await setTimeout(1100);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
