"use client";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import type { Telemetry } from "@/lib/tracking";
export default function GoogleTrackingMap({
  telemetry,
}: {
  telemetry: Telemetry | null;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key)
    return (
      <div className="empty-state">
        Google Maps aún no está configurado. Puedes consultar el esquema de la
        ruta.
      </div>
    );
  return (
    <APIProvider
      apiKey={key}
      onError={() => console.warn("No se pudo cargar Google Maps")}
    >
      <Map
        style={{ width: "100%", height: "100%", minHeight: 450 }}
        defaultCenter={{ lat: -16.405, lng: -71.548 }}
        defaultZoom={13}
        gestureHandling="cooperative"
        disableDefaultUI
      >
        {telemetry && (
          <Marker
            position={{ lat: telemetry.latitude, lng: telemetry.longitude }}
            title={`Unidad ${telemetry.vehicleId}`}
          />
        )}
      </Map>
      <span className="google-notice">
        {telemetry ? "Ubicación GPS de la unidad" : "Sin telemetría GPS"} ·
        Recorrido pendiente de georreferenciar
      </span>
    </APIProvider>
  );
}
