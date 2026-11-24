"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  Compass,
  ExternalLink,
  Layers,
  LoaderCircle,
  MapPinned,
  Route as RouteIcon,
  ShieldCheck,
  TrafficCone,
  X,
} from "lucide-react";
import type { BusRoute, Coordinate } from "@/lib/routes";
import type { Telemetry } from "@/lib/tracking";
import {
  inArequipa,
  pathLengths,
  positionOnRoad,
  routeAddresses,
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
type LoadState = "loading" | "ready" | "error";
// Solo memoria de la pestaña: animar o seleccionar una referencia no vuelve a
// facturar el cálculo. No guardar cartografía Google en el SW/localStorage.
const roadRequests = new globalThis.Map<string, Promise<RoadGeometry>>();

function MapConfiguration({ message }: { message: string }) {
  return (
    <div className="maps-configuration">
      <div className="maps-orbit orbit-one" />
      <div className="maps-orbit orbit-two" />
      <div className="maps-configuration-content">
        <span className="google-map-emblem">
          <MapPinned size={34} />
        </span>
        <span className="provider-eyebrow">GOOGLE MAPS PLATFORM</span>
        <h3>
          Las calles reales.
          <br />
          <em>Tu siguiente viaje.</em>
        </h3>
        <p>{message}</p>
        <div className="map-setup-pills">
          <span>
            <ShieldCheck size={14} />
            Clave restringida
          </span>
          <span>
            <RouteIcon size={14} />
            Routes API
          </span>
        </div>
        <a
          href="https://console.cloud.google.com/google/maps-apis?project=project-5103f937-0e09-49a7-a63"
          target="_blank"
          rel="noreferrer"
        >
          Revisar configuración de Google <ExternalLink size={14} />
        </a>
        <small>
          El mapa aparecerá cuando las APIs y la facturación estén activas.
        </small>
      </div>
    </div>
  );
}

function RoadLayers({
  route,
  selected,
  progress,
  telemetry,
  onSelect,
  onGeometry,
  onStatus,
  onLoadState,
}: Props & { onLoadState: (state: LoadState) => void }) {
  const map = useMap(),
    library = useMapsLibrary("routes");
  const [geometry, setGeometry] = useState<RoadGeometry | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const markers = useRef<
    { element: HTMLButtonElement; overlay: google.maps.OverlayView }[]
  >([]);
  const busElement = useRef<HTMLElement | null>(null);
  const busDistance = useRef<number | null>(null);
  const drawBus = useRef<(point: Coordinate) => void>(() => {});

  useEffect(() => {
    if (!map || !library) return;
    let cancelled = false;
    const lines: google.maps.Polyline[] = [];
    setGeometry(null);
    onGeometry(null);
    onStatus("Calculando calles");
    onLoadState("loading");
    if (!roadRequests.has(route.id)) {
      const addresses = routeAddresses(route);
      const promise = library.Route.computeRoutes({
        origin: addresses[0],
        destination: addresses.at(-1)!,
        intermediates: addresses.slice(1, -1).map((location) => ({ location })),
        optimizeWaypointOrder: false,
        travelMode: "DRIVING",
        routingPreference: "TRAFFIC_UNAWARE",
        region: "pe",
        language: "es",
        polylineQuality: "HIGH_QUALITY",
        fields: ["path", "legs", "distanceMeters", "viewport"],
      }).then((response) => {
        const result = response.routes?.[0];
        if (!result?.path?.length || !result.legs?.length)
          throw new Error("Recorrido incompleto");
        const path = result.path.map((p) => ({ lat: p.lat, lng: p.lng }));
        const cumulative = pathLengths(path),
          first = result.legs[0].startLocation;
        const ends = result.legs.map((leg) => leg.endLocation);
        if (!first || ends.some((p) => !p))
          throw new Error("Referencias incompletas");
        const pointPositions = [
          { lat: first.lat, lng: first.lng },
          ...ends.map((p) => ({ lat: p!.lat, lng: p!.lng })),
        ];
        let lower = 0;
        const pointDistances = pointPositions.map((point) => {
          let best = Infinity,
            chosen = lower;
          for (let i = lower; i < path.length; i++) {
            const d =
              (path[i].lat - point.lat) ** 2 + (path[i].lng - point.lng) ** 2;
            if (d < best) {
              best = d;
              chosen = i;
            }
          }
          lower = chosen;
          return cumulative[chosen];
        });
        const value = {
          routeId: route.id,
          path,
          cumulative,
          pointPositions,
          pointDistances,
          totalMeters: cumulative.at(-1)!,
        };
        if (!validateRoadGeometry(value, route.points.length))
          throw new Error("Ubicación fuera de Arequipa");
        return value;
      });
      roadRequests.set(route.id, promise);
      promise.catch(() => roadRequests.delete(route.id));
    }
    roadRequests
      .get(route.id)!
      .then((value) => {
        if (cancelled) return;
        setGeometry(value);
        onGeometry(value);
        onStatus("Recorrido por calles");
        onLoadState("ready");
        lines.push(
          new google.maps.Polyline({
            map,
            path: value.path,
            strokeColor: "#ffffff",
            strokeOpacity: 0.95,
            strokeWeight: 10,
            zIndex: 8,
          }),
          new google.maps.Polyline({
            map,
            path: value.path,
            strokeColor: route.color,
            strokeWeight: 5,
            zIndex: 9,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 2,
                  fillOpacity: 1,
                  strokeWeight: 0,
                },
                repeat: "150px",
                offset: "60px",
              },
            ],
          }),
        );
        const bounds = new google.maps.LatLngBounds();
        value.path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { top: 75, bottom: 100, left: 45, right: 65 });
      })
      .catch(() => {
        if (!cancelled) {
          onStatus("Recorrido no disponible");
          onLoadState("error");
        }
      });
    return () => {
      cancelled = true;
      lines.forEach((line) => line.setMap(null));
    };
  }, [map, library, route, onGeometry, onStatus, onLoadState]);

  useEffect(() => {
    if (!map || !geometry) return;
    class PointOverlay extends google.maps.OverlayView {
      constructor(
        private point: Coordinate,
        public element: HTMLElement,
      ) {
        super();
      }
      onAdd() {
        this.getPanes()?.overlayMouseTarget.appendChild(this.element);
      }
      draw() {
        const pixel = this.getProjection()?.fromLatLngToDivPixel(
          new google.maps.LatLng(this.point),
        );
        if (pixel)
          this.element.style.transform = `translate(${pixel.x}px,${pixel.y}px) translate(-50%,-50%)`;
      }
      onRemove() {
        this.element.remove();
      }
      move(point: Coordinate) {
        this.point = point;
        this.draw();
      }
    }
    markers.current = geometry.pointPositions.map((point, index) => {
      const element = document.createElement("button");
      element.className = "google-road-point";
      element.style.setProperty("--point-color", route.color);
      element.textContent = String(index + 1);
      element.title = route.points[index].name;
      element.setAttribute(
        "aria-label",
        `Seleccionar ${route.points[index].name}`,
      );
      element.addEventListener("click", () => selectRef.current(index));
      const overlay = new PointOverlay(point, element);
      overlay.setMap(map);
      return { element, overlay };
    });
    const element = document.createElement("div");
    element.className = "google-bus-marker";
    element.style.setProperty("--bus-color", route.color);
    busElement.current = element;
    element.innerHTML =
      '<span class="bus-pulse"></span><span class="bus-pin"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19v2m8-2v2M9 6h6M8 15h1m6 0h1"/></svg></span><span class="bus-pin-label"></span>';
    const overlay = new PointOverlay(geometry.path[0], element);
    overlay.setMap(map);
    drawBus.current = (p) => overlay.move(p);
    busDistance.current = null;
    return () => {
      markers.current.forEach((marker) => marker.overlay.setMap(null));
      markers.current = [];
      overlay.setMap(null);
      drawBus.current = () => {};
      busElement.current = null;
      busDistance.current = null;
    };
  }, [map, geometry, route]);
  useEffect(() => {
    markers.current.forEach((marker, index) => {
      marker.element.classList.toggle("selected", index === selected);
      marker.element.setAttribute("aria-pressed", String(index === selected));
    });
  }, [selected, geometry]);
  useEffect(() => {
    if (!geometry || !busElement.current) return;
    const element = busElement.current;
    element.querySelector(".bus-pin-label")!.textContent =
      progress === null ? "GPS" : "BUS DEMO";
    element.setAttribute(
      "aria-label",
      progress === null
        ? "Ubicación GPS de la unidad"
        : "Bus simulado sobre calles reales",
    );
    if (progress === null) {
      element.style.display = telemetry ? "block" : "none";
      if (
        telemetry &&
        inArequipa({ lat: telemetry.latitude, lng: telemetry.longitude })
      )
        drawBus.current({ lat: telemetry.latitude, lng: telemetry.longitude });
      return;
    }
    element.style.display = "block";
    let raf = 0;
    const target = Math.max(0, Math.min(1, progress)) * geometry.totalMeters;
    let start = busDistance.current ?? target;
    if (Math.abs(start - target) > geometry.totalMeters * 0.1) start = target;
    const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
      begin = performance.now();
    const frame = (time: number) => {
      const fraction = reduced ? 1 : Math.min(1, (time - begin) / 1800);
      const d = start + (target - start) * fraction;
      const point = positionOnRoad(geometry.path, geometry.cumulative, d);
      if (point) {
        drawBus.current(point);
        busDistance.current = d;
      }
      if (fraction < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geometry, progress, telemetry]);
  return null;
}

function MapControls({
  route,
  selectedName,
}: {
  route: BusRoute;
  selectedName: string;
}) {
  const map = useMap();
  const [satellite, setSatellite] = useState(false),
    [traffic, setTraffic] = useState(false);
  useEffect(() => {
    if (!map) return;
    const layer = new google.maps.TrafficLayer();
    if (traffic) layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, traffic]);
  return (
    <>
      <div className="google-map-toolbar">
        <span className="map-route-label">
          <i style={{ background: route.color }} />
          {route.name}
          <span>Google Maps</span>
        </span>
        <div>
          <button
            aria-label={satellite ? "Ver calles" : "Ver satélite"}
            aria-pressed={satellite}
            onClick={() => {
              setSatellite((v) => !v);
              map?.setMapTypeId(satellite ? "roadmap" : "hybrid");
            }}
          >
            <Layers size={17} />
          </button>
          <button
            aria-label="Mostrar tráfico real de Google"
            aria-pressed={traffic}
            onClick={() => setTraffic((v) => !v)}
          >
            <TrafficCone size={17} />
          </button>
          <button
            aria-label="Centrar Arequipa"
            onClick={() => {
              map?.panTo({ lat: -16.4, lng: -71.54 });
              map?.setZoom(13);
            }}
          >
            <Compass size={17} />
          </button>
        </div>
      </div>
      <div className="google-selection-chip">
        <MapPinned size={17} />
        <span>
          <small>TU REFERENCIA</small>
          {selectedName}
        </span>
        <span className="route-mini-code" style={{ background: route.color }}>
          {route.code}
        </span>
      </div>
    </>
  );
}

export default function GoogleTrackingMap(props: Props) {
  const [authError, setAuthError] = useState(false),
    [loadState, setLoadState] = useState<LoadState>("loading");
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const billingPending = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_PENDING === "true";
  const stableLoadState = useCallback(
    (state: LoadState) => setLoadState(state),
    [],
  );
  useEffect(() => {
    const target = window as Window & { gm_authFailure?: () => void };
    const previous = target.gm_authFailure;
    target.gm_authFailure = () => {
      setAuthError(true);
      props.onStatus("Google Maps pendiente");
    };
    return () => {
      target.gm_authFailure = previous;
    };
  }, [props.onStatus]);
  if (!key || authError || billingPending)
    return (
      <MapConfiguration
        message={
          billingPending
            ? "Google Maps está conectado, pero Google requiere completar y acreditar el prepago antes de autorizar el mapa. Los recorridos por calles siguen pendientes de verificación."
            : !key
            ? "Falta conectar la clave de Google Maps con esta versión de la aplicación."
            : "Google no autorizó el mapa. Revisa la facturación, la activación de Maps JavaScript API y el dominio permitido."
        }
      />
    );
  return (
    <div className="google-street-map">
      <APIProvider
        apiKey={key}
        version="weekly"
        language="es"
        region="PE"
        onError={() => setAuthError(true)}
      >
        <Map
          defaultCenter={{ lat: -16.405, lng: -71.548 }}
          defaultZoom={13}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          styles={[
            { featureType: "poi.business", stylers: [{ visibility: "off" }] },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#c9e8e3" }],
            },
            {
              featureType: "landscape",
              elementType: "geometry",
              stylers: [{ color: "#f4f5ef" }],
            },
          ]}
        >
          <RoadLayers {...props} onLoadState={stableLoadState} />
          <MapControls
            route={props.route}
            selectedName={props.route.points[props.selected].name}
          />
        </Map>
      </APIProvider>
      {loadState === "loading" && (
        <div className="route-computing">
          <LoaderCircle size={16} className="spin" />
          Calculando el recorrido por calles…
        </div>
      )}
      {loadState === "error" && (
        <div className="route-map-error" role="status">
          <X size={17} />
          <span>
            No se pudo calcular la ruta completa. Comprueba Routes API y la
            facturación; si están activas, revisa las referencias ambiguas. No
            se dibujan rectas como sustituto.
          </span>
        </div>
      )}
      {loadState === "ready" && (
        <div className="google-route-caption">
          <span className="dot" />
          Geometría Google ·{" "}
          {props.progress !== null ? "Bus simulado" : "GPS de la unidad"} ·
          Trazado pendiente de validación UCSM
        </div>
      )}
    </div>
  );
}
