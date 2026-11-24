import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onValueWritten } from "firebase-functions/v2/database";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import {
  validateSample,
  verifiedRoutePoints,
  combineEta,
  meters,
  notificationEvents,
} from "./core.mjs";

initializeApp();
const db = getDatabase(),
  firestore = getFirestore();
const routesKey = defineSecret("GOOGLE_ROUTES_API_KEY");
const region = "us-central1";

// Dispositivos con custom claims, nunca cuentas de estudiantes ni API keys públicas.
export const ingestTelemetry = onCall(
  { region, enforceAppCheck: true, maxInstances: 2 },
  async (request) => {
    let sample;
    try {
      sample = validateSample(request.data, request.auth?.token);
    } catch {
      throw new HttpsError(
        "permission-denied",
        "Dispositivo no autorizado o muestra inválida.",
      );
    }
    const result = await db
      .ref(`rawTelemetry/${sample.routeId}`)
      .transaction((current) => {
        if (
          current &&
          (sample.sampledAt <= current.sampledAt ||
            sample.updatedAt - current.updatedAt < 4000 ||
            (current.tripId === sample.tripId &&
              sample.sequence <= current.sequence))
        )
          return;
        return sample;
      });
    if (!result.committed)
      throw new HttpsError(
        "failed-precondition",
        "Muestra antigua, repetida o demasiado frecuente.",
      );
    return { accepted: true };
  },
);

async function calculateEtas(sample, points) {
  const remaining = points.slice(sample.nextPointIndex);
  if (!remaining.length) return {};
  const waypoint = (point) => ({
    location: { latLng: { latitude: point.lat, longitude: point.lng } },
  });
  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": routesKey.value(),
        "X-Goog-FieldMask": "routes.legs.duration",
      },
      body: JSON.stringify({
        origin: waypoint({ lat: sample.latitude, lng: sample.longitude }),
        destination: waypoint(remaining.at(-1)),
        intermediates: remaining.slice(0, -1).map(waypoint),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        departureTime: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) throw new Error(`routes-http-${response.status}`);
  const data = await response.json();
  const legs = data.routes?.[0]?.legs;
  if (!Array.isArray(legs) || legs.length !== remaining.length)
    throw new Error("routes-legs");
  let seconds = 0;
  const etas = {};
  for (let i = 0; i < remaining.length; i++) {
    const duration = Number.parseFloat(legs[i].duration);
    if (!Number.isFinite(duration) || duration < 0)
      throw new Error("routes-duration");
    seconds += duration;
    // Históricos de recorrido restante validados por un administrador en la configuración.
    const history =
      remaining[i].historyByNextPoint?.[sample.nextPointIndex] ?? null;
    etas[remaining[i].id] = combineEta(
      seconds,
      history,
      sample.speedKmh,
      meters({ lat: sample.latitude, lng: sample.longitude }, remaining[i]),
    );
  }
  return etas;
}

export const processTelemetry = onValueWritten(
  {
    ref: "/rawTelemetry/{routeId}",
    region,
    secrets: [routesKey],
    maxInstances: 2,
    concurrency: 1,
  },
  async (event) => {
    const sample = event.data.after.val();
    if (!sample || Date.now() - sample.updatedAt > 60000) return;
    const config = (
      await firestore.doc(`routes/${event.params.routeId}`).get()
    ).data();
    const points = verifiedRoutePoints(config?.points, sample.routeId);
    let etas = {};
    if (points && config?.etaEnabled === true) {
      try {
        etas = await calculateEtas(sample, points);
      } catch (error) {
        logger.warn("ETA temporalmente no disponible", {
          routeId: sample.routeId,
          reason: error.message,
        });
      }
    }
    const lastPointId = points?.at(-1)?.id ?? null;
    const value = {
      ...sample,
      etas,
      etaMinutes: lastPointId ? (etas[lastPointId] ?? null) : null,
      targetPointId: lastPointId,
    };
    // No permitir que una ejecución lenta sobreescriba una muestra posterior.
    const result = await db
      .ref(`telemetry/${sample.routeId}`)
      .transaction((current) =>
        current && current.sampledAt >= sample.sampledAt ? undefined : value,
      );
    if (!result.committed) return;
  },
);

// Trigger separado: observa únicamente datos ya publicados en orden.
export const sendTransportAlerts = onValueWritten(
  { ref: "/telemetry/{routeId}", region, maxInstances: 2 },
  async (event) => {
    const sample = event.data.after.val(),
      previous = event.data.before.val();
    if (!sample || Date.now() - sample.updatedAt > 60000) return;
    const config = (
      await firestore.doc(`routes/${sample.routeId}`).get()
    ).data();
    const points = verifiedRoutePoints(config?.points, sample.routeId) || [];
    const users = await firestore
      .collection("users")
      .where("routeId", "==", sample.routeId)
      .get();
    // Secuencial por usuario para mantener acotados el fan-out y las solicitudes FCM.
    for (const profile of users.docs) {
      const preferences = profile.data();
      const point = points.find((p) => p.id === preferences.habitualPointId);
      for (const kind of notificationEvents(
        previous,
        sample,
        preferences,
        point,
      )) {
        const id = `${sample.tripId}_${preferences.habitualPointId}_${kind}`;
        const notification = profile.ref.collection("notifications").doc(id);
        const title = {
          proximity: "Tu bus está cerca",
          arrival: "El bus llegó a tu paradero",
          delay: "Retraso en tu ruta",
          diversion: "Desvío temporal de ruta",
        }[kind];
        const body =
          kind === "proximity"
            ? `Ruta ${sample.routeId}: a ${preferences.threshold} minutos de ${point?.name || preferences.habitualPointId}.`
            : `Revisa el estado de tu Ruta ${sample.routeId} en BusTrack.`;
        const claimed = await firestore.runTransaction(async (transaction) => {
          if ((await transaction.get(notification)).exists) return false;
          transaction.create(notification, {
            title,
            body,
            routeId: sample.routeId,
            demo: false,
            read: false,
            time: Date.now(),
            state: "claimed",
            createdAt: FieldValue.serverTimestamp(),
          });
          return true;
        });
        if (!claimed) continue;
        const devices = await profile.ref.collection("devices").limit(10).get();
        const tokens = devices.docs
          .map((d) => d.data().token)
          .filter((t) => typeof t === "string");
        if (!tokens.length) {
          await notification.update({ state: "no-devices" });
          continue;
        }
        try {
          const response = await getMessaging().sendEachForMulticast({
            tokens,
            data: { title, body, routeId: sample.routeId, tag: id },
            webpush: { headers: { TTL: "60", Urgency: "high" } },
          });
          await notification.update({
            state: "sent",
            successfulDevices: response.successCount,
          });
          for (let i = 0; i < response.responses.length; i++)
            if (
              [
                "messaging/registration-token-not-registered",
                "messaging/invalid-registration-token",
              ].includes(response.responses[i].error?.code)
            )
              await devices.docs[i].ref.delete();
        } catch {
          await notification.update({ state: "delivery-failed" });
          logger.error("Fallo al entregar alerta", {
            routeId: sample.routeId,
            kind,
          });
        }
      }
    }
  },
);
