"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BusLogo } from "./bus-logo";
import { onAuthStateChanged, getAuth, signOut, type User } from "firebase/auth";
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  BusFront,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  GraduationCap,
  Heart,
  Info,
  Leaf,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  Navigation,
  Pause,
  Play,
  Radio,
  Route as RouteIcon,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { roadDemoEta, type RoadGeometry } from "@/lib/maps";
import {
  routeById,
  routes,
  sourceNotice,
  officialSources,
  type RouteId,
} from "@/lib/routes";
import {
  arrivalTime,
  crossedThreshold,
  demoProgress,
  isFresh,
  occupancyLabel,
  type Telemetry,
} from "@/lib/tracking";
import {
  firebaseApp,
  firebaseConfigured,
  institutionalDomain,
  institutionalSignIn,
  institutionalUser,
  markNotificationRead,
  readPreferences,
  registerPush,
  savePreferences,
  subscribeNotifications,
  subscribeTelemetry,
  unregisterPush,
  type Preferences,
} from "@/lib/firebase";

const OpenTrackingMap = dynamic(() => import("./open-map"), {
  ssr: false,
  loading: () => <div className="empty-state">Cargando el mapa…</div>,
});
function notificationCopy(text: string): string {
  return text
    .replace(/demostración/gi, "referencia")
    .replace(/simulación/gi, "vista de referencia")
    .replace(/simulado/gi, "de referencia")
    .replace(/simulada/gi, "de referencia");
}

type Tab = "mapa" | "rutas" | "favoritos" | "alertas" | "perfil";
type Alert = {
  id: string;
  title: string;
  body: string;
  time: number;
  read: boolean;
  routeId: RouteId;
  demo: boolean;
};
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type ModalType =
  | "source"
  | "image"
  | "login"
  | "help"
  | "simulation"
  | "install"
  | null;
const navItems = [
  { id: "mapa", label: "Mi viaje", icon: MapIcon },
  { id: "rutas", label: "Explorar rutas", icon: RouteIcon },
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "alertas", label: "Notificaciones", icon: Bell },
] as const;

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="modal"
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Cerrar ventana"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export default function TrackerApp() {
  const [tab, setTab] = useState<Tab>("mapa");
  const [routeId, setRouteId] = useState<RouteId>("norte");
  const [selected, setSelected] = useState(10);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [threshold, setThreshold] = useState(5);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(0);
  const [paused, setPaused] = useState(false);
  const [demo, setDemo] = useState(true);
  const [offline, setOffline] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [preferencesUid, setPreferencesUid] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [incident, setIncident] = useState<"normal" | "delay" | "diversion">(
    "normal",
  );
  const [occupancy, setOccupancy] = useState(24);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [roadGeometry, setRoadGeometry] = useState<RoadGeometry | null>(null);
  const [mapStatus, setMapStatus] = useState("OpenFreeMap");
  const previousEta = useRef<number | null>(null);
  const previousProgress = useRef<number>(0);
  const notificationCycle = useRef(new Set<string>());
  const route = routeById(routeId);
  const point = route.points[selected] ?? route.points[0];
  const progress = demo ? demoProgress(route, tick) : null;
  const fresh =
    !demo &&
    telemetry !== null &&
    !offline &&
    isFresh(telemetry.updatedAt, now);
  const eta = demo
    ? roadDemoEta(route, roadGeometry, progress!, selected)
    : fresh
      ? (telemetry!.etas[point.id] ??
        (telemetry?.targetPointId === point.id ? telemetry.etaMinutes : null))
      : null;
  const activeIncident = demo ? incident : fresh ? telemetry!.status : "normal";
  const occupied = demo ? occupancy : fresh ? telemetry!.occupancy : null;
  const capacity = demo ? 50 : fresh ? telemetry!.capacity : null;
  const aforo = occupancyLabel(occupied, capacity);
  const unread = alerts.filter((alert) => !alert.read).length;
  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    setNow(Date.now());
    const initialRoute = new URLSearchParams(window.location.search).get(
      "route",
    );
    try {
      const value = JSON.parse(localStorage.getItem("bus-track:v1") || "null");
      if (value) {
        if (Array.isArray(value.favorites))
          setFavorites(
            value.favorites
              .filter((v: unknown): v is string => typeof v === "string")
              .slice(0, 100),
          );
        if (typeof value.alerts === "boolean") setAlertsEnabled(value.alerts);
        if ([3, 5, 10].includes(value.threshold)) setThreshold(value.threshold);
        if (routes.some((r) => r.id === value.routeId)) {
          setRouteId(value.routeId);
          const r = routeById(value.routeId);
          const index = r.points.findIndex(
            (p) => p.id === value.habitualPointId,
          );
          setSelected(index >= 0 ? index : r.points.length - 1);
        }
      }
      const history = JSON.parse(
        localStorage.getItem("bus-track:alerts:v1") || "[]",
      );
      if (Array.isArray(history))
        setAlerts(
          history
            .filter(
              (a) =>
                typeof a?.id === "string" &&
                typeof a.title === "string" &&
                typeof a.body === "string" &&
                typeof a.time === "number" &&
                routes.some((r) => r.id === a.routeId),
            )
            .slice(0, 100),
        );
    } catch {
      /* El navegador puede bloquear el almacenamiento. */
    }
    if (initialRoute && routes.some((r) => r.id === initialRoute)) {
      const r = routeById(initialRoute);
      setRouteId(r.id);
      setSelected(r.points.length - 1);
    }
    setReady(true);
    const online = () => setOffline(!navigator.onLine);
    online();
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    const install = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", install);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => notify("No se pudo habilitar el modo sin conexión."));
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, [notify]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(getAuth(firebaseApp()), (current) => {
      setUser(institutionalUser(current) ? current : null);
      setPreferencesUid(null);
      if (!institutionalUser(current)) {
        setTelemetry(null);
        setDemo(true);
      }
    });
  }, []);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    readPreferences(user.uid)
      .then((preferences) => {
        if (cancelled) return;
        if (preferences) {
          if (Array.isArray(preferences.favorites))
            setFavorites(
              preferences.favorites.filter((v) => typeof v === "string"),
            );
          if (typeof preferences.alerts === "boolean")
            setAlertsEnabled(preferences.alerts);
          if ([3, 5, 10].includes(preferences.threshold ?? 0))
            setThreshold(preferences.threshold!);
          if (routes.some((r) => r.id === preferences.routeId)) {
            const r = routeById(preferences.routeId!);
            setRouteId(r.id);
            const index = r.points.findIndex(
              (p) => p.id === preferences.habitualPointId,
            );
            setSelected(index >= 0 ? index : r.points.length - 1);
          }
        }
        setPreferencesUid(user.uid);
      })
      .catch(() =>
        notify(
          "No se pudieron cargar tus preferencias de la nube. Se conservan las de este dispositivo.",
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [user, notify]);
  useEffect(() => {
    if (!user) return;
    return subscribeNotifications(
      user.uid,
      (cloud) =>
        setAlerts((current) =>
          [...cloud, ...current.filter((alert) => alert.demo)]
            .sort((a, b) => b.time - a.time)
            .slice(0, 100),
        ),
      () => notify("No se pudo cargar el historial de alertas de la nube."),
    );
  }, [user, notify]);
  useEffect(() => {
    if (!ready) return;
    const preferences: Preferences = {
      favorites,
      alerts: alertsEnabled,
      threshold,
      routeId,
      habitualPointId: point.id,
    };
    try {
      localStorage.setItem("bus-track:v1", JSON.stringify(preferences));
      localStorage.setItem(
        "bus-track:alerts:v1",
        JSON.stringify(alerts.slice(0, 100)),
      );
    } catch {
      /* Preferencias de sesión siguen funcionando. */
    }
    if (user && preferencesUid === user.uid) {
      const timeout = setTimeout(
        () =>
          savePreferences(user.uid, preferences).catch(() =>
            notify(
              "No se pudo sincronizar. Tus cambios están guardados en este dispositivo.",
            ),
          ),
        600,
      );
      return () => clearTimeout(timeout);
    }
  }, [
    ready,
    favorites,
    alertsEnabled,
    threshold,
    routeId,
    point.id,
    alerts,
    user,
    preferencesUid,
    notify,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (demo && !paused && !offline) setTick((value) => value + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, [demo, paused, offline]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (demo || !user) return;
    setTelemetry(null);
    setGpsError("");
    return subscribeTelemetry(routeId, setTelemetry, setGpsError);
  }, [demo, user, routeId]);

  const addAlert = useCallback(
    (title: string, body: string, simulated = true) => {
      setAlerts((current) =>
        [
          {
            id: crypto.randomUUID(),
            title,
            body,
            time: Date.now(),
            read: false,
            routeId,
            demo: simulated,
          },
          ...current,
        ].slice(0, 100),
      );
    },
    [routeId],
  );
  useEffect(() => {
    previousEta.current = null;
    notificationCycle.current.clear();
  }, [routeId, selected, threshold, demo]);
  useEffect(() => {
    if (!demo || !alertsEnabled || offline) {
      previousEta.current = eta;
      return;
    }
    if (progress !== null && progress < previousProgress.current)
      notificationCycle.current.clear();
    previousProgress.current = progress ?? 0;
    if (
      crossedThreshold(previousEta.current, eta, threshold) &&
      !notificationCycle.current.has("proximity")
    ) {
      notificationCycle.current.add("proximity");
      addAlert(
        "Tu bus está cerca",
        `${route.name} está a ${threshold} minutos de ${point.name}. Aviso local de referencia.`,
      );
      notify(`Aviso local: tu bus está a ${threshold} minutos.`);
    }
    if (
      crossedThreshold(previousEta.current, eta, 0) &&
      !notificationCycle.current.has("arrival")
    ) {
      notificationCycle.current.add("arrival");
      addAlert(
        "El bus llegó a tu referencia",
        `${route.name} llegó a ${point.name} en la vista de referencia.`,
      );
    }
    previousEta.current = eta;
  }, [
    eta,
    demo,
    alertsEnabled,
    threshold,
    route.name,
    point.name,
    progress,
    offline,
    addAlert,
    notify,
  ]);

  const chooseRoute = (id: RouteId) => {
    const r = routeById(id);
    setRouteId(id);
    setSelected(r.points.length - 1);
    setTick(0);
    setIncident("normal");
    setRoadGeometry(null);
    setTelemetry(null);
    setGpsError("");
  };
  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id].slice(0, 100),
    );
  };
  const markRead = (ids: string[]) => {
    const targets = alerts.filter((alert) => ids.includes(alert.id));
    setAlerts((current) =>
      current.map((alert) =>
        ids.includes(alert.id) ? { ...alert, read: true } : alert,
      ),
    );
    if (user)
      Promise.all(
        targets
          .filter((alert) => !alert.demo)
          .map((alert) => markNotificationRead(user.uid, alert.id)),
      ).catch(() => notify("No se pudo sincronizar la lectura de avisos."));
  };
  const login = async () => {
    setBusy(true);
    try {
      await institutionalSignIn();
      setModal(null);
      notify("Sesión institucional iniciada.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    try {
      if (user) await unregisterPush(user.uid);
      await signOut(getAuth(firebaseApp()));
      setDemo(true);
      setUser(null);
      setPreferencesUid(null);
      setFavorites([]);
      setAlerts([]);
      setAlertsEnabled(true);
      setThreshold(5);
      setTelemetry(null);
      notify("Sesión cerrada.");
    } catch {
      notify("No se pudo cerrar la sesión. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  };
  const openLive = () => {
    if (!user) {
      setModal("login");
      return;
    }
    setDemo(false);
    setTick(0);
    setRoadGeometry(null);
  };
  const push = async () => {
    if (!user) {
      setModal("login");
      return;
    }
    setBusy(true);
    try {
      await registerPush(user.uid);
      setAlertsEnabled(true);
      notify("Notificaciones push activadas en este dispositivo.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "No se pudieron activar las notificaciones.",
      );
    } finally {
      setBusy(false);
    }
  };
  const simulate = (type: "proximity" | "arrival" | "delay" | "diversion") => {
    if (type === "proximity")
      addAlert(
        `Tu bus está a ${threshold} minutos`,
        `${route.name} se aproxima a ${point.name}. Vista previa del aviso.`,
      );
    else if (type === "arrival")
      addAlert(
        "El bus llegó",
        `${route.name} llegó a ${point.name}. Vista previa del aviso.`,
      );
    else {
      setIncident(type);
      addAlert(
        type === "delay" ? "Retraso en el recorrido" : "Desvío temporal",
        `${route.name}: ${type === "delay" ? "retraso de referencia" : "desvío de referencia"}.`,
      );
    }
    notify("Alerta de prueba creada. Revísala en Notificaciones.");
  };

  const journeyPanel = (
    <aside className="journey-panel">
      <div className="section-top">
        <span className="eyebrow">PLANIFICA TU LLEGADA</span>
        <Navigation size={17} />
      </div>
      <h2>Tu próximo bus</h2>
      <p className="muted">Un vistazo y estás listo para salir.</p>
      <label className="field-label" htmlFor="journey-route">
        Tu ruta
      </label>
      <div className="select-wrap">
        <span
          className="route-symbol small"
          style={{ background: route.light, color: route.color }}
        >
          {route.code}
        </span>
        <select
          id="journey-route"
          value={routeId}
          onChange={(event) => chooseRoute(event.target.value as RouteId)}
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <ChevronDown size={15} />
      </div>
      <label className="field-label" htmlFor="journey-point">
        Punto de referencia
      </label>
      <div className="select-wrap">
        <MapPin size={17} />
        <select
          id="journey-point"
          value={selected}
          onChange={(event) => setSelected(Number(event.target.value))}
        >
          {route.points.map((p, index) => (
            <option key={p.id} value={index}>
              {p.order}. {p.name}
            </option>
          ))}
        </select>
        <ChevronDown size={15} />
      </div>
      <div className="arrival-card">
        <div className="arrival-title">
          <span>
            <span className={`dot ${!demo && !fresh ? "grey" : ""}`} />
            {demo
              ? "Tiempo orientativo"
              : fresh
                ? "Estimación GPS"
                : "Esperando GPS"}
          </span>
          <BusFront size={18} />
        </div>
        <div className="eta">
          {eta === null ? "—" : eta}
          <span>min</span>
        </div>
        <p>
          {eta === null
            ? demo
              ? roadGeometry && roadGeometry.routeId === route.id
                ? roadGeometry.pointDistances[selected] === null
                  ? "Referencia sin ubicación confirmada en el mapa"
                  : "El bus ya pasó por esta referencia"
                : "La estimación aparecerá al cargar el recorrido"
              : "Sin estimación disponible para este punto"
            : `Llegada aproximada · ${arrivalTime(eta, now)}`}
        </p>
        <div className="arrival-divider" />
        <div className="occupancy">
          <span>
            <Users size={16} />
            Aforo {demo ? "de referencia" : "reportado"}
          </span>
          <b className={`aforo ${aforo.toLowerCase().replace(" ", "-")}`}>
            {aforo}
          </b>
        </div>
        <div className="capacity-bar">
          <span
            style={{
              width:
                capacity && occupied !== null
                  ? `${Math.min(100, (occupied / capacity) * 100)}%`
                  : "0%",
            }}
          />
        </div>
        <div className="capacity-caption">
          {occupied !== null && capacity
            ? `${occupied} de ${capacity} plazas · ${demo ? "capacidad de ejemplo" : "dato de la unidad"}`
            : "Ocupación no disponible"}
        </div>
      </div>
      <button
        className={`button ${alertsEnabled ? "primary" : "outline"} full`}
        onClick={() => {
          setAlertsEnabled((v) => !v);
          notify(
            alertsEnabled
              ? "Avisos de proximidad desactivados."
              : `Te avisaremos a ${threshold} minutos ${demo ? "en la vista de referencia" : "si activaste push"}.`,
          );
        }}
      >
        {alertsEnabled ? <BellRing size={17} /> : <Bell size={17} />}
        {alertsEnabled
          ? `Avisarme ${threshold} min antes`
          : "Activar aviso de proximidad"}
        {alertsEnabled && <Check size={16} />}
      </button>
      <button
        className="text-button full"
        onClick={() => toggleFavorite(point.id)}
      >
        <Heart
          size={16}
          fill={favorites.includes(point.id) ? "currentColor" : "none"}
        />
        {favorites.includes(point.id)
          ? "Referencia guardada"
          : "Guardar esta referencia"}
      </button>
      <div className="journey-note">
        <ShieldCheck size={16} />
        <span>
          Las láminas describen el recorrido. Confirma dónde está permitido
          abordar.
        </span>
      </div>
    </aside>
  );

  return (
    <div className="app-shell vivid-app">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="UCSM BusTrack inicio">
          <span className="brand-icon">
            <BusLogo size={34} />
          </span>
          <span>
            BusTrack
            <span className="brand-sub">UCSM · MOVILIDAD UNIVERSITARIA</span>
          </span>
        </a>
        <div className="sidebar-label">TU CAMPUS, MÁS CERCA</div>
        <nav aria-label="Navegación principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === "alertas" && unread > 0 ? (
                <span className="nav-badge">{unread}</span>
              ) : tab === item.id ? (
                <span className="nav-active-dot" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">TUS RECORRIDOS</div>
        <div className="sidebar-routes">
          {routes.map((r) => (
            <button
              key={r.id}
              className={routeId === r.id ? "selected" : ""}
              onClick={() => {
                chooseRoute(r.id);
                setTab("mapa");
              }}
            >
              <span className="route-dot" style={{ background: r.color }} />
              {r.name}
              <span>{r.departure}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="eco-card">
            <span className="eco-icon">
              <Leaf size={22} />
            </span>
            <strong>
              Una mejor forma
              <br />
              de llegar.
            </strong>
            <p>
              Transporte universitario.
              <br />
              Más cerca de tu siguiente clase.
            </p>
            <button onClick={() => setModal("source")}>
              Conoce el servicio <ArrowRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={19} />
            <span>¿Necesitas ayuda?</span>
          </button>
          <button
            className={`profile-mini ${tab === "perfil" ? "selected" : ""}`}
            onClick={() => setTab("perfil")}
          >
            <span className="avatar">
              {user?.displayName?.slice(0, 1) || "E"}
            </span>
            <span>
              <b>{user?.displayName?.split(" ")[0] || "Estudiante"}</b>
              <small>
                {user ? "Cuenta institucional" : "Mi espacio de viaje"}
              </small>
            </span>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-location">
            <span className="mobile-brand">
              <BusFront size={22} />
              BusTrack
            </span>
            <MapPin size={15} />
            <span>Arequipa, Perú</span>
            <span className="topbar-separator">/</span>
            <b>Campus Umacollo</b>
          </div>
          <div className="topbar-actions">
            <span className="date-label">
              {ready
                ? new Intl.DateTimeFormat("es-PE", {
                    timeZone: "America/Lima",
                    day: "numeric",
                    month: "long",
                  }).format(now)
                : "UCSM"}
            </span>
            <button
              className="icon-button notification-button"
              aria-label={`Notificaciones, ${unread} sin leer`}
              onClick={() => setTab("alertas")}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            {!user ? (
              <button className="login-small" onClick={() => setModal("login")}>
                <LogIn size={16} />
                <span>Acceder</span>
              </button>
            ) : (
              <span className="avatar small">
                {user.displayName?.slice(0, 1) || "E"}
              </span>
            )}
          </div>
        </header>
        <div className={`demo-banner ${!demo ? "live-banner" : ""}`}>
          <span>
            <span className="demo-badge">
              {demo ? <Sparkles size={12} /> : <Radio size={12} />}
              {demo ? "RECORRIDOS" : "GPS REAL"}
            </span>
            {demo
              ? "Posición de referencia · Sin conexión GPS."
              : "Seguimiento de unidades conectadas a Firebase."}
          </span>
          <button
            onClick={() => (demo ? setModal("simulation") : setDemo(true))}
          >
            {demo ? "Ajustes del recorrido" : "Explorar recorridos"}
            <ChevronRight size={14} />
          </button>
        </div>
        {offline && (
          <div className="connection-banner" role="status">
            <WifiOff size={16} />
            Sin conexión. El recorrido está pausado y los datos GPS pueden estar
            desactualizados.
          </div>
        )}
        <main id="main" className="main-content">
          {tab === "mapa" && (
            <section className="campus-hero">
              <div className="hero-copy">
                <span className="hero-kicker">
                  <span className="dot" /> HECHO PARA TU VIDA UNIVERSITARIA
                </span>
                <h2>
                  Tu campus.
                  <br />
                  <span>A un viaje de ti.</span>
                </h2>
                <p>
                  Cuatro rutas. Menos vueltas.
                  <br className="hero-mobile-break" /> Más tiempo para lo que
                  importa.
                </p>
                <div className="hero-actions">
                  <button
                    onClick={() =>
                      document.getElementById("live-map")?.scrollIntoView({
                        behavior: window.matchMedia(
                          "(prefers-reduced-motion: reduce)",
                        ).matches
                          ? "instant"
                          : "smooth",
                        block: "center",
                      })
                    }
                  >
                    Ver mi recorrido <ArrowRight size={17} />
                  </button>
                  <span>
                    <Leaf size={15} />
                    Nos movemos contigo
                  </span>
                </div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <div className="hero-orbit hero-orbit-one" />
                <div className="hero-orbit hero-orbit-two" />
                <span className="hero-destination">
                  <GraduationCap size={20} />
                  <span>
                    Próxima parada<b>UCSM · Umacollo</b>
                  </span>
                </span>
                <div className="hero-road">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="hero-bus">
                  <div className="hero-bus-front">
                    <span className="bus-destination">UCSM</span>
                    <span className="bus-windscreen" />
                    <span className="bus-headlights" />
                    <span className="bus-grille" />
                  </div>
                  <div className="hero-bus-side">
                    <span />
                    <span />
                    <span />
                    <span className="bus-door" />
                    <b>BusTrack</b>
                    <i className="wheel first" />
                    <i className="wheel second" />
                  </div>
                </div>
                <span className="hero-float-pill">
                  <BusFront size={16} />
                  Tu ruta, más cerca <Sparkles size={13} />
                </span>
              </div>
            </section>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow greeting">
                {tab === "mapa"
                  ? "MENOS ESPERA. MÁS VIDA UNIVERSITARIA."
                  : "MOVILIDAD SANTAMARIANA"}
              </div>
              <h1>
                {tab === "mapa" ? (
                  <>
                    ¿Hacia dónde<span> vamos hoy?</span>
                  </>
                ) : tab === "rutas" ? (
                  "Cuatro rutas. Un mismo destino."
                ) : tab === "favoritos" ? (
                  "Tus lugares de siempre."
                ) : tab === "alertas" ? (
                  "Siempre un paso adelante."
                ) : (
                  "Tu viaje, a tu manera."
                )}
              </h1>
              <p>
                {tab === "mapa"
                  ? "Elige tu recorrido. Nosotros te ayudamos a encontrarlo."
                  : tab === "rutas"
                    ? "Conoce los recorridos y horarios del turno mañana."
                    : tab === "favoritos"
                      ? "Tus rutas y referencias, a un toque de distancia."
                      : tab === "alertas"
                        ? "Avisos de llegada, proximidad y cambios en el recorrido."
                        : "Administra tu cuenta, tus avisos y tus preferencias."}
              </p>
            </div>
            <button
              className="button outline install-button"
              onClick={() => setModal("install")}
            >
              <ArrowDownToLine size={16} />
              Instalar app
            </button>
          </div>

          {tab === "mapa" && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-icon green">
                    <RouteIcon size={21} />
                  </span>
                  <div>
                    <span>Rutas disponibles</span>
                    <strong>
                      04 <small>recorridos</small>
                    </strong>
                  </div>
                  <span className="stat-detail">N · S · E · O</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon blue">
                    <Clock3 size={21} />
                  </span>
                  <div>
                    <span>Turno mañana</span>
                    <strong>
                      {route.departure} <small>salida</small>
                    </strong>
                  </div>
                  <span className="stat-detail">{route.name}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon amber">
                    <GraduationCap size={21} />
                  </span>
                  <div>
                    <span>Para estudiantes UCSM</span>
                    <strong>
                      Gratuito <small>según UCSM</small>
                    </strong>
                  </div>
                  <Leaf size={18} className="stat-leaf" />
                </div>
              </div>
              <div className="tracking-layout">
                <section className="tracking-card">
                  <div className="map-header">
                    <div>
                      <h2>
                        <span className="dot" />
                        {demo ? "Tu recorrido por Arequipa" : "Seguimiento GPS"}
                      </h2>
                      <span>
                        {demo
                          ? "Calles de Arequipa · Referencias de tu viaje"
                          : fresh
                            ? `Última señal: ${new Date(telemetry!.updatedAt).toLocaleTimeString("es-PE", { timeZone: "America/Lima" })}`
                            : gpsError ||
                              "Aún no hay una señal reciente de esta unidad"}
                      </span>
                    </div>
                    <div className="map-header-actions">
                      {demo && (
                        <button
                          className="icon-button"
                          aria-label={
                            paused ? "Reanudar recorrido" : "Pausar recorrido"
                          }
                          onClick={() => setPaused((v) => !v)}
                        >
                          {paused ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                      )}
                      <span className="status-chip">
                        {demo
                          ? paused || offline
                            ? "Pausado"
                            : mapStatus
                          : fresh
                            ? "Conectado"
                            : "Sin señal"}
                      </span>
                    </div>
                  </div>
                  <div
                    className="route-tabs"
                    role="group"
                    aria-label="Seleccionar ruta"
                  >
                    {routes.map((r) => (
                      <button
                        key={r.id}
                        aria-pressed={routeId === r.id}
                        className={routeId === r.id ? "active" : ""}
                        style={
                          {
                            "--route-color": r.color,
                            "--route-light": r.light,
                          } as React.CSSProperties
                        }
                        onClick={() => chooseRoute(r.id)}
                      >
                        <span style={{ background: r.color }} />
                        {r.name}
                      </button>
                    ))}
                  </div>
                  {activeIncident !== "normal" && (
                    <div className="incident-banner" role="status">
                      <Info size={15} />
                      {activeIncident === "delay"
                        ? "Retraso en el recorrido"
                        : "Desvío temporal de ruta"}
                      {demo ? " · Aviso local" : " · Aviso de la unidad"}
                    </div>
                  )}
                  <div className="open-map-container" id="live-map">
                    <OpenTrackingMap
                      route={route}
                      selected={selected}
                      progress={demo && !offline ? progress : null}
                      telemetry={fresh ? telemetry : null}
                      onSelect={setSelected}
                      onGeometry={setRoadGeometry}
                      onStatus={setMapStatus}
                    />
                  </div>
                  <div className="map-bottom">
                    <span>
                      <Info size={14} />
                      {demo
                        ? "Recorrido orientativo · Referencias de las láminas UCSM"
                        : fresh
                          ? "GPS recibido · OpenFreeMap"
                          : "No se muestra una ubicación sin GPS reciente"}
                    </span>
                    <button onClick={() => setModal("image")}>
                      Ver lámina <ExternalLink size={13} />
                    </button>
                  </div>
                </section>
                {journeyPanel}
              </div>
              <section className="route-overview">
                <div className="section-heading">
                  <div>
                    <h2>Elige hacia dónde vas</h2>
                    <p>Cuatro formas de conectar con tu campus.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setTab("rutas")}
                  >
                    Ver todas las rutas <ArrowRight size={16} />
                  </button>
                </div>
                <div className="route-cards">
                  {routes.map((r) => (
                    <button
                      className={`route-card ${routeId === r.id ? "current" : ""}`}
                      style={
                        {
                          "--route-color": r.color,
                          "--route-light": r.light,
                        } as React.CSSProperties
                      }
                      key={r.id}
                      onClick={() => chooseRoute(r.id)}
                    >
                      <div className="route-card-top">
                        <span className="route-symbol">{r.code}</span>
                        <ChevronRight size={17} />
                      </div>
                      <strong>{r.name}</strong>
                      <p>{r.area}</p>
                      <div className="route-card-bottom">
                        <span>
                          <Clock3 size={13} />
                          {r.departure} – {r.arrival}
                        </span>
                        <small>{r.points.length} referencias</small>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === "rutas" && (
            <section className="explore-layout">
              <div className="explore-list">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Buscar rutas o referencias"
                    placeholder="Busca una ruta, avenida o referencia"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      aria-label="Limpiar búsqueda"
                      onClick={() => setQuery("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {routes
                  .filter((r) =>
                    `${r.name} ${r.area} ${r.points.map((p) => p.name).join(" ")}`
                      .toLocaleLowerCase("es")
                      .includes(query.toLocaleLowerCase("es")),
                  )
                  .map((r) => (
                    <article
                      key={r.id}
                      className={`explore-route ${r.id === routeId ? "active" : ""}`}
                      style={
                        { "--route-color": r.color } as React.CSSProperties
                      }
                    >
                      <button
                        className="explore-main"
                        onClick={() => chooseRoute(r.id)}
                      >
                        <span
                          className="route-symbol"
                          style={{ color: r.color, background: r.light }}
                        >
                          {r.code}
                        </span>
                        <span>
                          <strong>{r.name}</strong>
                          <small>{r.area}</small>
                          <span className="explore-time">
                            {r.departure} → {r.arrival} · {r.duration} min
                          </span>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                      <button
                        className="icon-button favorite-route"
                        aria-label={`${favorites.includes(`route:${r.id}`) ? "Quitar" : "Guardar"} ${r.name}`}
                        aria-pressed={favorites.includes(`route:${r.id}`)}
                        onClick={() => toggleFavorite(`route:${r.id}`)}
                      >
                        <Heart
                          size={18}
                          fill={
                            favorites.includes(`route:${r.id}`)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </article>
                  ))}
                {!routes.some((r) =>
                  `${r.name} ${r.area} ${r.points.map((p) => p.name).join(" ")}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ) && (
                  <div className="empty-state">
                    <Search size={28} />
                    <h3>No encontramos ese recorrido</h3>
                    <p>
                      Prueba con Norte, Sur, Este, Oeste o el nombre de una
                      avenida.
                    </p>
                  </div>
                )}
                <div className="info-box">
                  <Info size={18} />
                  <p>{sourceNotice}</p>
                </div>
              </div>
              <section className="route-detail">
                <div className="route-detail-head">
                  <span
                    className="route-symbol"
                    style={{ color: route.color, background: route.light }}
                  >
                    {route.code}
                  </span>
                  <div>
                    <h2>{route.name}</h2>
                    <p>Turno mañana · {route.points.length} referencias</p>
                  </div>
                  <button
                    className="button outline"
                    onClick={() => setModal("image")}
                  >
                    <BookOpen size={16} />
                    Lámina
                  </button>
                </div>
                <div className="schedule-band">
                  <span>
                    <small>PARTIDA</small>
                    <b>{route.departure}</b>
                  </span>
                  <ArrowRight size={20} />
                  <span>
                    <small>LLEGADA</small>
                    <b>{route.arrival}</b>
                  </span>
                  <span>
                    <small>DURACIÓN</small>
                    <b>{route.duration} min</b>
                  </span>
                </div>
                <div className="timeline">
                  {route.points.map((p, i) => (
                    <div
                      className={`timeline-row ${selected === i ? "selected" : ""}`}
                      key={p.id}
                    >
                      <button
                        className="timeline-point"
                        style={
                          {
                            "--route-color": route.color,
                          } as React.CSSProperties
                        }
                        onClick={() => setSelected(i)}
                        aria-pressed={selected === i}
                      >
                        <span className="point-number">{p.order}</span>
                        <span>
                          {p.name}
                          <small>
                            {i === 0
                              ? "Inicio del recorrido"
                              : i === route.points.length - 1
                                ? "Final del recorrido"
                                : "Vía o referencia de la lámina"}
                          </small>
                        </span>
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${favorites.includes(p.id) ? "Quitar" : "Guardar"} ${p.name}`}
                        onClick={() => toggleFavorite(p.id)}
                      >
                        <Heart
                          size={16}
                          fill={
                            favorites.includes(p.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="button primary full"
                  onClick={() => setTab("mapa")}
                >
                  Seguir esta ruta <ArrowRight size={16} />
                </button>
              </section>
            </section>
          )}

          {tab === "favoritos" && (
            <section className="favorites-page">
              {favorites.length === 0 ? (
                <div className="empty-state large">
                  <span className="empty-icon">
                    <Heart size={30} />
                  </span>
                  <h2>Tus favoritos empiezan aquí</h2>
                  <p>
                    Guarda una ruta o una referencia para encontrarla
                    <br />
                    más rápido en tu próximo viaje.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setTab("rutas")}
                  >
                    Explorar rutas <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="favorites-grid">
                  {routes
                    .flatMap((r) => [
                      ...(favorites.includes(`route:${r.id}`)
                        ? [
                            {
                              id: `route:${r.id}`,
                              name: r.name,
                              index: r.points.length - 1,
                              route: r,
                              type: "Ruta favorita",
                            },
                          ]
                        : []),
                      ...r.points
                        .filter((p) => favorites.includes(p.id))
                        .map((p) => ({
                          id: p.id,
                          name: p.name,
                          index: p.order - 1,
                          route: r,
                          type: "Referencia favorita",
                        })),
                    ])
                    .map((f) => (
                      <article className="favorite-card" key={f.id}>
                        <div className="section-top">
                          <span
                            className="route-symbol small"
                            style={{
                              background: f.route.light,
                              color: f.route.color,
                            }}
                          >
                            {f.route.code}
                          </span>
                          <button
                            className="icon-button"
                            aria-label={`Quitar ${f.name} de favoritos`}
                            onClick={() => toggleFavorite(f.id)}
                          >
                            <Heart size={18} fill="currentColor" />
                          </button>
                        </div>
                        <small className="muted">
                          {f.type} · {f.route.name}
                        </small>
                        <h3>{f.name}</h3>
                        <p>
                          <Clock3 size={14} />
                          {f.route.departure} – {f.route.arrival}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => {
                            chooseRoute(f.route.id);
                            setSelected(f.index);
                            setTab("mapa");
                          }}
                        >
                          Ver mi viaje <ArrowRight size={16} />
                        </button>
                      </article>
                    ))}
                </div>
              )}
            </section>
          )}

          {tab === "alertas" && (
            <section className="alerts-page">
              <div className="alerts-toolbar">
                <span>
                  <BellRing size={17} />
                  {unread} {unread === 1 ? "aviso sin leer" : "avisos sin leer"}
                </span>
                <button
                  className="text-button"
                  disabled={!unread}
                  onClick={() =>
                    markRead(
                      alerts
                        .filter((alert) => !alert.read)
                        .map((alert) => alert.id),
                    )
                  }
                >
                  <Check size={16} />
                  Marcar todos como leídos
                </button>
              </div>
              {alerts.length === 0 ? (
                <div className="empty-state large">
                  <span className="empty-icon">
                    <Bell size={30} />
                  </span>
                  <h2>Todo tranquilo por aquí</h2>
                  <p>
                    Los avisos de tus viajes aparecerán aquí.
                    <br />
                    Puedes ver cómo se presenta un aviso en tu dispositivo.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => {
                      setDemo(true);
                      simulate("proximity");
                    }}
                  >
                    Probar una alerta <BellRing size={16} />
                  </button>
                </div>
              ) : (
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <article
                      key={alert.id}
                      className={`alert-item ${alert.read ? "read" : ""}`}
                    >
                      <span className="alert-icon">
                        <BellRing size={20} />
                      </span>
                      <div>
                        <div className="alert-title">
                          <h3>{notificationCopy(alert.title)}</h3>
                          {alert.demo && (
                            <span className="mini-badge">LOCAL</span>
                          )}
                        </div>
                        <p>{notificationCopy(alert.body)}</p>
                        <small>
                          {new Date(alert.time).toLocaleString("es-PE", {
                            timeZone: "America/Lima",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {routeById(alert.routeId).name}
                        </small>
                        <button
                          className="text-button"
                          onClick={() => {
                            markRead([alert.id]);
                            chooseRoute(alert.routeId);
                            setTab("mapa");
                          }}
                        >
                          Ver recorrido <ArrowRight size={13} />
                        </button>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={
                          alert.read
                            ? `Aviso leído: ${alert.title}`
                            : `Marcar leído: ${alert.title}`
                        }
                        disabled={alert.read}
                        onClick={() => markRead([alert.id])}
                      >
                        <Check size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <div className="info-box">
                <Info size={17} />
                <p>
                  Los avisos locales se guardan en este dispositivo. Las alertas
                  push reales requieren sesión institucional, configuración
                  Firebase y telemetría conectada.
                </p>
              </div>
            </section>
          )}

          {tab === "perfil" && (
            <section className="profile-page">
              <div className="settings-card">
                <div className="profile-heading">
                  <span className="avatar large">
                    {user?.displayName?.slice(0, 1) || "E"}
                  </span>
                  <div>
                    <h2>{user?.displayName || "Hola, estudiante"}</h2>
                    <p>{user?.email || "Explora BusTrack a tu ritmo"}</p>
                    <span className="mini-badge">
                      {user ? "CUENTA INSTITUCIONAL" : "ESPACIO UNIVERSITARIO"}
                    </span>
                  </div>
                </div>
                {user ? (
                  <button
                    className="button outline"
                    onClick={logout}
                    disabled={busy}
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                ) : (
                  <button
                    className="button primary"
                    onClick={() => setModal("login")}
                  >
                    <LogIn size={16} />
                    Acceder con cuenta UCSM
                  </button>
                )}
                <div className="settings-divider" />
                <h3>Preferencias de viaje</h3>
                <div className="setting-row">
                  <div>
                    <b>Avisos de proximidad</b>
                    <p>Entérate cuando tu bus se acerque.</p>
                  </div>
                  <button
                    className={`switch ${alertsEnabled ? "on" : ""}`}
                    role="switch"
                    aria-checked={alertsEnabled}
                    aria-label="Avisos de proximidad"
                    onClick={() => setAlertsEnabled((v) => !v)}
                  >
                    <span />
                  </button>
                </div>
                <div className="setting-row">
                  <div>
                    <b>Tiempo de anticipación</b>
                    <p>Elige cuándo quieres recibir tu aviso.</p>
                  </div>
                  <select
                    aria-label="Minutos de anticipación"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                  >
                    <option value={3}>3 minutos</option>
                    <option value={5}>5 minutos</option>
                    <option value={10}>10 minutos</option>
                  </select>
                </div>
                <div className="setting-row">
                  <div>
                    <b>Notificaciones del dispositivo</b>
                    <p>Recibe alertas aun con la app cerrada.</p>
                  </div>
                  <button
                    className="button outline"
                    disabled={busy || demo}
                    onClick={push}
                  >
                    Activar push
                  </button>
                </div>
                {demo && (
                  <p className="muted tiny">
                    Las pruebas de alertas están disponibles sin permisos del
                    navegador. Para push real, inicia sesión y cambia a GPS
                    real.
                  </p>
                )}
              </div>
              <div className="settings-card">
                <h2>Tu aplicación</h2>
                <div className="setting-row">
                  <div>
                    <b>Modo de seguimiento</b>
                    <p>
                      {demo
                        ? "Posición de referencia, sin conexión GPS."
                        : "Datos de una unidad conectada."}
                    </p>
                  </div>
                  <button
                    className="button outline"
                    onClick={() => (demo ? openLive() : setDemo(true))}
                  >
                    {demo ? "Conectar GPS" : "Explorar recorridos"}
                  </button>
                </div>
                <button
                  className="settings-link"
                  onClick={() => setModal("install")}
                >
                  <ArrowDownToLine size={19} />
                  <span>Instalar BusTrack</span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="settings-link"
                  onClick={() => setModal("source")}
                >
                  <BookOpen size={19} />
                  <span>Fuentes y datos de las rutas</span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="settings-link"
                  onClick={() => setModal("help")}
                >
                  <CircleHelp size={19} />
                  <span>Ayuda y preguntas frecuentes</span>
                  <ChevronRight size={17} />
                </button>
                <div className="project-note">
                  <Leaf size={22} />
                  <strong>Hecho para la comunidad santamariana.</strong>
                  <p>
                    Proyecto universitario independiente. Sin vinculación
                    oficial con la operación del transporte UCSM.
                  </p>
                  <small>UCSM BusTrack · v1.0</small>
                </div>
              </div>
            </section>
          )}
          <footer className="footer">
            <span>
              <BusFront size={15} />
              UCSM BusTrack <i />
              Proyecto universitario
            </span>
            <button onClick={() => setModal("source")}>
              Información de las rutas <ExternalLink size={12} />
            </button>
          </footer>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {[
          ...navItems,
          { id: "perfil" as const, label: "Perfil", icon: Settings2 },
        ].map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={21} />
            <span>
              {item.id === "mapa"
                ? "Mi viaje"
                : item.id === "rutas"
                  ? "Rutas"
                  : item.id === "alertas"
                    ? "Alertas"
                    : item.label}
            </span>
            {item.id === "alertas" && unread > 0 && <i />}
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Info size={18} />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "source"
              ? "Rutas con una fuente clara"
              : modal === "image"
                ? `${route.name} · Lámina del recorrido`
                : modal === "login"
                  ? "Tu campus te espera"
                  : modal === "simulation"
                    ? "Ajustes de tu recorrido"
                    : modal === "install"
                      ? "Lleva BusTrack contigo"
                      : "Estamos para ayudarte"
          }
          onClose={() => setModal(null)}
        >
          {modal === "source" && (
            <div className="modal-body">
              <p>{sourceNotice}</p>
              <h3>Láminas del proyecto</h3>
              <div className="source-routes">
                {routes.map((r) => (
                  <a key={r.id} href={r.image} target="_blank" rel="noreferrer">
                    <span
                      className="route-dot"
                      style={{ background: r.color }}
                    />
                    {r.name}
                    <span>
                      {r.departure}–{r.arrival}
                    </span>
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
              <h3>Publicaciones oficiales consultadas</h3>
              {officialSources.map((source) => (
                <a
                  className="source-link"
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    {source.title}
                    <small>{source.date}</small>
                  </span>
                  <ExternalLink size={16} />
                </a>
              ))}
              <div className="info-box">
                <ShieldCheck size={18} />
                <p>
                  Los horarios de la app se transcribieron de tus láminas. La
                  nota oficial de 2025 contiene otra programación. No se ha
                  confirmado la vigencia actual ni hay acceso a GPS
                  universitario.
                </p>
              </div>
            </div>
          )}
          {modal === "image" && (
            <div className="modal-body image-modal">
              <img
                src={route.image}
                width="1920"
                height="1920"
                alt={`Lámina ${route.name}, turno mañana. Recorrido y horarios transcritos en Explorar rutas.`}
              />
              <p>
                Fuente proporcionada para el proyecto · Fecha de vigencia no
                indicada.
              </p>
              <a
                href={route.image}
                className="text-button"
                target="_blank"
                rel="noreferrer"
              >
                Abrir imagen completa <ExternalLink size={15} />
              </a>
            </div>
          )}
          {modal === "login" && (
            <div className="modal-body login-modal">
              <span className="login-illustration">
                <BusFront size={45} />
                <span>
                  <GraduationCap size={24} />
                </span>
              </span>
              <h3>
                Menos espera.
                <br />
                Más tiempo para ti.
              </h3>
              <p>
                Accede con tu correo institucional para sincronizar favoritos y
                recibir avisos de tus viajes.
              </p>
              <button
                className="button primary full"
                disabled={busy || !firebaseConfigured}
                onClick={login}
              >
                <LogIn size={18} />
                {busy ? "Conectando…" : "Continuar con Google UCSM"}
              </button>
              <p className="tiny muted">
                Correo verificado @{institutionalDomain}
              </p>
              {!firebaseConfigured && (
                <div className="info-box">
                  <Info size={18} />
                  <p>
                    El acceso institucional necesita la configuración de
                    Firebase. Puedes consultar los recorridos sin cuenta.
                  </p>
                </div>
              )}
              <button
                className="text-button full"
                onClick={() => {
                  setDemo(true);
                  setModal(null);
                }}
              >
                Explorar recorridos <ArrowRight size={16} />
              </button>
              <p className="tiny muted">
                Proyecto universitario independiente. No solicita tu contraseña
                UCSM.
              </p>
            </div>
          )}
          {modal === "simulation" && (
            <div className="modal-body">
              <p>
                Personaliza la reproducción del recorrido y la vista previa de
                avisos. Los ajustes solo afectan a esta vista.
              </p>
              <div className="setting-row">
                <div>
                  <b>Movimiento de la unidad</b>
                  <p>Velocidad según la duración del recorrido.</p>
                </div>
                <button
                  className="button outline"
                  onClick={() => setPaused((v) => !v)}
                >
                  {paused ? <Play size={15} /> : <Pause size={15} />}
                  {paused ? "Reanudar" : "Pausar"}
                </button>
              </div>
              <label className="field-label" htmlFor="occupancy-range">
                Aforo de referencia: {occupancy} / 50
              </label>
              <input
                id="occupancy-range"
                type="range"
                min="0"
                max="50"
                value={occupancy}
                onChange={(e) => setOccupancy(Number(e.target.value))}
              />
              <div className="simulation-actions">
                <button
                  className="button outline"
                  onClick={() => simulate("proximity")}
                >
                  <BellRing size={16} />
                  Probar proximidad
                </button>
                <button
                  className="button outline"
                  onClick={() => simulate("arrival")}
                >
                  <MapPin size={16} />
                  Probar llegada
                </button>
                <button
                  className="button outline"
                  onClick={() => simulate("delay")}
                >
                  <Clock3 size={16} />
                  Vista previa: retraso
                </button>
                <button
                  className="button outline"
                  onClick={() => simulate("diversion")}
                >
                  <RouteIcon size={16} />
                  Vista previa: desvío
                </button>
              </div>
              {incident !== "normal" && (
                <div className="info-box">
                  <Info size={17} />
                  <p>
                    {incident === "delay" ? "Retraso" : "Desvío"} de referencia
                    activo.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setIncident("normal")}
                  >
                    Restablecer
                  </button>
                </div>
              )}
              <button
                className="text-button full"
                onClick={() => {
                  setTick(0);
                  setIncident("normal");
                  setPaused(false);
                  notify("Recorrido reiniciado.");
                }}
              >
                Reiniciar recorrido
              </button>
              <button
                className="button primary full"
                onClick={() => setModal(null)}
              >
                Volver a mi viaje <ArrowRight size={16} />
              </button>
            </div>
          )}
          {modal === "install" && (
            <div className="modal-body">
              <div className="install-art">
                <img src="/icon.svg" width="76" height="76" alt="BusTrack" />
                <span>Siempre a un toque.</span>
              </div>
              <p>
                Instala la aplicación para abrirla como una app desde la
                pantalla de inicio.
              </p>
              {installPrompt ? (
                <button
                  className="button primary full"
                  onClick={async () => {
                    await installPrompt.prompt();
                    const choice = await installPrompt.userChoice;
                    setInstallPrompt(null);
                    if (choice.outcome === "accepted") {
                      setModal(null);
                      notify("BusTrack se está instalando.");
                    }
                  }}
                >
                  Instalar BusTrack <ArrowDownToLine size={17} />
                </button>
              ) : (
                <>
                  <h3>En iPhone o iPad</h3>
                  <p>
                    Abre esta página en Safari, toca Compartir y elige “Añadir a
                    pantalla de inicio”.
                  </p>
                  <h3>En Android o computadora</h3>
                  <p>
                    Abre el menú de tu navegador y elige “Instalar aplicación” o
                    “Añadir a pantalla de inicio”, cuando esté disponible.
                  </p>
                </>
              )}
              <div className="info-box">
                <WifiOff size={18} />
                <p>
                  Las láminas de las rutas quedan disponibles sin conexión
                  después de la primera visita. El GPS y las alertas requieren
                  internet.
                </p>
              </div>
            </div>
          )}
          {modal === "help" && (
            <div className="modal-body faq">
              <details open>
                <summary>¿Cómo encuentro mi bus?</summary>
                <p>
                  Elige una de las cuatro rutas y una referencia. La tarjeta
                  muestra estimaciones de referencia mientras no haya una unidad
                  GPS conectada.
                </p>
              </details>
              <details>
                <summary>¿Los puntos son paraderos oficiales?</summary>
                <p>
                  Las imágenes describen calles y referencias del recorrido. No
                  indican coordenadas exactas ni certifican puntos autorizados
                  de abordaje. Confírmalo con la universidad.
                </p>
              </details>
              <details>
                <summary>¿Por qué no veo un GPS real?</summary>
                <p>
                  Este proyecto aún no tiene acceso a las unidades de
                  transporte. El modo GPS real requiere Firebase, una cuenta
                  institucional y un emisor autorizado. Nunca se reemplaza una
                  señal faltante por un bus ficticio.
                </p>
              </details>
              <details>
                <summary>¿Cómo funcionan los avisos?</summary>
                <p>
                  Guarda una referencia y selecciona tu anticipación. Sin GPS,
                  los avisos son locales y se generan dentro de la app. Los push
                  reales necesitan permisos del dispositivo y configuración del
                  servidor. No se garantiza una entrega exacta al minuto.
                </p>
              </details>
              <details>
                <summary>¿Qué necesito para abordar?</summary>
                <p>
                  La publicación UCSM de marzo de 2025 pide carné universitario,
                  DNI o fotocheck. Consulta las condiciones actuales con la
                  universidad.
                </p>
              </details>
              <details>
                <summary>¿Se guarda mi ubicación?</summary>
                <p>
                  La consulta de recorridos no solicita tu ubicación. Los
                  favoritos y avisos se guardan en este navegador. Al iniciar
                  sesión, los favoritos y preferencias se sincronizan con
                  Firebase.
                </p>
              </details>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
