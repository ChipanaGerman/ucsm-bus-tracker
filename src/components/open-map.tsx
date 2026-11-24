"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  FullscreenControl,
  LngLatBounds,
  setWorkerUrl,
} from "maplibre-gl";
import {
  Compass,
  Layers,
  LoaderCircle,
  MapPinned,
  RotateCw,
} from "lucide-react";
import type { BusRoute, Coordinate } from "@/lib/routes";
import type { Telemetry } from "@/lib/tracking";
import {
  inArequipa,
  positionOnRoad,
  validateRoadGeometry,
  type RoadGeometry,
} from "@/lib/maps";

type Props = {
  route: BusRoute;
  selected: number;
  progress: number | null;
  telemetry: Telemetry | null;
  onSelect: (index: number) => void;
  onGeometry: (value: RoadGeometry | null) => void;
  onStatus: (status: string) => void;
};
const STYLE = "https://tiles.openfreemap.org/styles/liberty";
setWorkerUrl("/vendor/maplibre-worker.mjs");
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function OpenTrackingMap({
  route,
  selected,
  progress,
  telemetry,
  onSelect,
  onGeometry,
  onStatus,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [threeD, setThreeD] = useState(false);
  const [geometry, setGeometry] = useState<RoadGeometry | null>(null);
  const markers = useRef<
    { element: HTMLButtonElement; marker: Marker; index: number }[]
  >([]);
  const bus = useRef<Marker | null>(null);
  const busDistance = useRef<number | null>(null);
  const callbacks = useRef({ onSelect, onGeometry, onStatus });
  callbacks.current = { onSelect, onGeometry, onStatus };

  useEffect(() => {
    if (!container.current) return;
    setReady(false);
    setMapError(false);
    let instance: Map;
    try {
      instance = new Map({
        container: container.current,
        style: STYLE,
        center: [-71.546, -16.4],
        zoom: 12.5,
        maxPitch: 50,
        cooperativeGestures: true,
        attributionControl: { compact: true },
        locale: {
          "NavigationControl.ZoomIn": "Acercar mapa",
          "NavigationControl.ZoomOut": "Alejar mapa",
          "NavigationControl.ResetBearing": "Orientar al norte",
          "FullscreenControl.Enter": "Pantalla completa",
          "FullscreenControl.Exit": "Salir de pantalla completa",
        },
      });
    } catch {
      setMapError(true);
      return;
    }
    map.current = instance;
    instance.addControl(
      new NavigationControl({ showCompass: true }),
      "top-right",
    );
    instance.addControl(new FullscreenControl(), "top-right");
    const timeout = window.setTimeout(() => {
      if (!instance.isStyleLoaded()) setMapError(true);
    }, 20000);
    instance.on("load", () => {
      clearTimeout(timeout);
      setMapError(false);
      // Heights come from the OpenMapTiles building layer, where available.
      const label = instance
        .getStyle()
        .layers.find((layer) => layer.type === "symbol")?.id;
      if (instance.getSource("openmaptiles"))
        instance.addLayer(
          {
            id: "campus-buildings",
            type: "fill-extrusion",
            source: "openmaptiles",
            "source-layer": "building",
            minzoom: 14,
            layout: { visibility: "none" },
            paint: {
              "fill-extrusion-color": "#b3c9bb",
              "fill-extrusion-height": [
                "coalesce",
                ["get", "render_height"],
                0,
              ],
              "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                0,
              ],
              "fill-extrusion-opacity": 0.8,
            },
          },
          label,
        );
      setReady(true);
    });
    // Failed tiles do not erase an otherwise usable map. Retry is offered for a
    // failed initial style or a lost WebGL context, without request loops.
    instance.on("webglcontextlost", () => setMapError(true));
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      map.current = null;
      instance.remove();
    };
  }, [attempt]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current,
      controller = new AbortController();
    setThreeD(false);
    if (instance.getLayer("campus-buildings"))
      instance.setLayoutProperty("campus-buildings", "visibility", "none");
    instance.jumpTo({ pitch: 0, bearing: 0 });
    setGeometry(null);
    setRouteError(false);
    callbacks.current.onGeometry(null);
    callbacks.current.onStatus("Cargando recorrido");
    fetch(`/map-routes/${route.id}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("No route");
        return response.json();
      })
      .then((value: RoadGeometry) => {
        if (controller.signal.aborted) return;
        if (
          value.routeId !== route.id ||
          !validateRoadGeometry(value, route.points.length)
        )
          throw new Error("Invalid route");
        instance.addSource("bus-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: value.path.map((p) => [p.lng, p.lat]),
            },
          },
        });
        instance.addLayer({
          id: "bus-route-halo",
          type: "line",
          source: "bus-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 9,
            "line-opacity": 0.95,
          },
        });
        instance.addLayer({
          id: "bus-route-line",
          type: "line",
          source: "bus-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": route.color, "line-width": 4.5 },
        });
        markers.current = value.pointPositions.flatMap((point, index) => {
          if (!point) return [];
          const wrapper = document.createElement("div"),
            element = document.createElement("button");
          element.className = "road-point";
          element.style.setProperty("--point-color", route.color);
          element.textContent = String(index + 1);
          element.title = route.points[index].name;
          element.setAttribute(
            "aria-label",
            `Seleccionar ${route.points[index].name}`,
          );
          element.addEventListener("click", () =>
            callbacks.current.onSelect(index),
          );
          wrapper.appendChild(element);
          return [
            {
              element,
              index,
              marker: new Marker({ element: wrapper })
                .setLngLat([point.lng, point.lat])
                .addTo(instance),
            },
          ];
        });
        setGeometry(value);
        callbacks.current.onGeometry(value);
        callbacks.current.onStatus("Recorrido orientativo");
        const bounds = new LngLatBounds();
        value.path.forEach((p) => bounds.extend([p.lng, p.lat]));
        instance.fitBounds(bounds, {
          padding: { top: 65, bottom: 100, left: 35, right: 65 },
          maxZoom: 14,
          duration: reducedMotion() ? 0 : 850,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRouteError(true);
          callbacks.current.onStatus("Recorrido no disponible");
        }
      });
    return () => {
      controller.abort();
      markers.current.forEach((p) => p.marker.remove());
      markers.current = [];
      if (map.current === instance && instance.getStyle()) {
        for (const id of ["bus-route-line", "bus-route-halo"])
          if (instance.getLayer(id)) instance.removeLayer(id);
        if (instance.getSource("bus-route")) instance.removeSource("bus-route");
      }
    };
  }, [ready, route, attempt]);

  useEffect(() => {
    markers.current.forEach(({ element, index }) => {
      element.classList.toggle("selected", index === selected);
      element.setAttribute("aria-pressed", String(index === selected));
    });
  }, [selected, geometry]);

  useEffect(() => {
    if (!map.current || !geometry) return;
    const wrapper = document.createElement("div"),
      element = document.createElement("div");
    element.className = "road-bus-marker";
    element.style.setProperty("--bus-color", route.color);
    element.innerHTML = `<span class="bus-pulse"></span><span class="bus-pin"><svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect x="8" y="5" width="24" height="29" rx="8" fill="#eafff1"/><rect x="12" y="9" width="16" height="3" rx="1.5" fill="#074b3d"/><rect x="11.5" y="15" width="17" height="9" rx="2.5" fill="#075c49"/><path d="M20 15v9" stroke="#eafff1"/><rect x="5" y="16" width="3" height="7" rx="1.5" fill="#eafff1"/><rect x="32" y="16" width="3" height="7" rx="1.5" fill="#eafff1"/><circle cx="13.5" cy="28.5" r="2" fill="white"/><circle cx="26.5" cy="28.5" r="2" fill="white"/><rect x="11" y="32" width="5" height="5" rx="2" fill="#eafff1"/><rect x="24" y="32" width="5" height="5" rx="2" fill="#eafff1"/></svg></span><span class="bus-pin-label"></span>`;
    wrapper.appendChild(element);
    wrapper.style.display = "none";
    const marker = new Marker({ element: wrapper })
      .setLngLat([geometry.path[0].lng, geometry.path[0].lat])
      .addTo(map.current);
    bus.current = marker;
    busDistance.current = null;
    return () => {
      marker.remove();
      bus.current = null;
      busDistance.current = null;
    };
  }, [geometry, route]);

  useEffect(() => {
    if (!bus.current || !geometry) return;
    const marker = bus.current,
      element = marker.getElement();
    element.querySelector(".bus-pin-label")!.textContent =
      progress === null ? "GPS" : `BUS ${route.code}`;
    element.setAttribute(
      "aria-label",
      progress === null
        ? "Ubicación GPS de la unidad"
        : "Ubicación de referencia del bus, sin conexión GPS",
    );
    if (progress === null) {
      const point: Coordinate | null = telemetry
        ? { lat: telemetry.latitude, lng: telemetry.longitude }
        : null;
      element.style.display = point && inArequipa(point) ? "block" : "none";
      if (point && inArequipa(point)) marker.setLngLat([point.lng, point.lat]);
      return;
    }
    element.style.display = "block";
    const target = Math.max(0, Math.min(1, progress)) * geometry.totalMeters;
    let start = busDistance.current ?? target;
    if (Math.abs(target - start) > geometry.totalMeters * 0.1) start = target;
    const begin = performance.now(),
      reduced = reducedMotion();
    let raf = 0;
    const frame = (time: number) => {
      const t = reduced ? 1 : Math.min(1, (time - begin) / 1800),
        distance = start + (target - start) * t;
      const point = positionOnRoad(
        geometry.path,
        geometry.cumulative,
        distance,
      );
      if (point) {
        marker.setLngLat([point.lng, point.lat]);
        busDistance.current = distance;
      }
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [progress, telemetry, geometry]);

  function toggle3D() {
    const instance = map.current;
    if (!instance || !ready) return;
    const next = !threeD;
    setThreeD(next);
    if (instance.getLayer("campus-buildings"))
      instance.setLayoutProperty(
        "campus-buildings",
        "visibility",
        next ? "visible" : "none",
      );
    const focus = geometry?.pointPositions[selected];
    instance.easeTo({
      ...(next && focus
        ? { center: [focus.lng, focus.lat] as [number, number], zoom: 16 }
        : {}),
      pitch: next ? 40 : 0,
      bearing: 0,
      duration: reducedMotion() ? 0 : 900,
    });
  }
  const unresolved = geometry?.pointPositions.filter((p) => !p).length ?? 0;
  return (
    <div className="open-street-map">
      <div
        ref={container}
        className="maplibre-canvas-host"
        aria-label={`Mapa de ${route.name}`}
      />
      <div className="open-map-toolbar">
        <span className="map-route-label">
          <i style={{ background: route.color }} />
          {route.name}
          <span>OpenFreeMap</span>
        </span>
        <div>
          <button
            aria-label={threeD ? "Ver mapa en 2D" : "Ver edificios en 3D"}
            aria-pressed={threeD}
            onClick={toggle3D}
            disabled={!ready}
          >
            <Layers size={17} />
            <span>{threeD ? "2D" : "3D"}</span>
          </button>
          <button
            aria-label="Centrar recorrido"
            disabled={!geometry}
            onClick={() => {
              const bounds = new LngLatBounds();
              geometry?.path.forEach((p) => bounds.extend([p.lng, p.lat]));
              map.current?.fitBounds(bounds, {
                padding: { top: 65, bottom: 100, left: 35, right: 65 },
                pitch: 0,
                bearing: 0,
                duration: reducedMotion() ? 0 : 700,
              });
              setThreeD(false);
              if (map.current?.getLayer("campus-buildings"))
                map.current.setLayoutProperty(
                  "campus-buildings",
                  "visibility",
                  "none",
                );
            }}
          >
            <Compass size={17} />
          </button>
        </div>
      </div>
      <div className="open-selection-chip">
        <MapPinned size={17} />
        <span>
          <small>
            TU REFERENCIA
            {geometry && !geometry.pointPositions[selected]
              ? " · SIN UBICAR"
              : " · APROXIMADA"}
          </small>
          {route.points[selected].name}
        </span>
        <span className="route-mini-code" style={{ background: route.color }}>
          {route.code}
        </span>
      </div>
      {!mapError && (!ready || (!geometry && !routeError)) && (
        <div className="route-computing" role="status">
          <LoaderCircle size={16} className="spin" />
          {ready ? "Cargando recorrido…" : "Abriendo Arequipa…"}
        </div>
      )}
      {(mapError || routeError) && (
        <div className="route-map-error" role="status">
          <span>
            {mapError
              ? "No se pudo abrir el mapa. Revisa tu conexión y el soporte WebGL del navegador."
              : "No se pudo cargar el trazado. Los horarios y las láminas siguen disponibles."}
          </span>
          <button
            onClick={() => {
              setThreeD(false);
              setAttempt((v) => v + 1);
            }}
            aria-label="Reintentar mapa"
          >
            <RotateCw size={18} />
          </button>
        </div>
      )}
      {geometry && (
        <div className="open-route-caption">
          Calles OSM · Recorrido orientativo
          {unresolved > 0
            ? ` · ${unresolved} ${unresolved === 1 ? "referencia" : "referencias"} sin ubicar`
            : ""}
        </div>
      )}
      <a
        className="routing-attribution"
        href="https://routing.openstreetmap.de/about.html"
        target="_blank"
        rel="noreferrer"
      >
        Trazado OSRM / FOSSGIS
      </a>
    </div>
  );
}
