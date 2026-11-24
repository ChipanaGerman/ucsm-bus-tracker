import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { parseTelemetry, type Telemetry } from "./tracking";
import type { RouteId } from "./routes";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
export const firebaseConfigured = Boolean(
  config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.databaseURL &&
    config.appId,
);
export const institutionalDomain =
  process.env.NEXT_PUBLIC_INSTITUTIONAL_DOMAIN || "ucsm.edu.pe";
export function firebaseApp() {
  if (!firebaseConfigured)
    throw new Error(
      "El acceso institucional aún no está configurado. Puedes explorar la demostración.",
    );
  return getApps().length ? getApp() : initializeApp(config);
}
export function institutionalUser(user: User | null): boolean {
  return Boolean(
    user?.emailVerified &&
      user.email
        ?.toLowerCase()
        .endsWith(`@${institutionalDomain.toLowerCase()}`),
  );
}
export async function institutionalSignIn() {
  const auth = getAuth(firebaseApp());
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    hd: institutionalDomain,
    prompt: "select_account",
  });
  const { user } = await signInWithPopup(auth, provider);
  if (!institutionalUser(user)) {
    await signOut(auth);
    throw new Error(`Usa tu correo verificado @${institutionalDomain}.`);
  }
  return user;
}
export type Preferences = {
  favorites: string[];
  alerts: boolean;
  threshold: number;
  habitualPointId: string;
  routeId: RouteId;
};
export async function readPreferences(
  uid: string,
): Promise<Partial<Preferences> | null> {
  const snapshot = await getDoc(doc(getFirestore(firebaseApp()), "users", uid));
  return snapshot.exists() ? (snapshot.data() as Partial<Preferences>) : null;
}
export async function savePreferences(uid: string, preferences: Preferences) {
  await setDoc(doc(getFirestore(firebaseApp()), "users", uid), preferences, {
    merge: true,
  });
}
export type CloudNotification = {
  id: string;
  title: string;
  body: string;
  time: number;
  read: boolean;
  routeId: RouteId;
  demo: boolean;
};
export function subscribeNotifications(
  uid: string,
  next: (items: CloudNotification[]) => void,
  error: () => void,
) {
  return onSnapshot(
    query(
      collection(getFirestore(firebaseApp()), "users", uid, "notifications"),
      orderBy("time", "desc"),
      limit(100),
    ),
    (snapshot) => {
      const items = snapshot.docs.flatMap((document) => {
        const d = document.data();
        return typeof d.title === "string" &&
          typeof d.body === "string" &&
          typeof d.time === "number" &&
          ["norte", "sur", "este", "oeste"].includes(d.routeId)
          ? [
              {
                id: document.id,
                title: d.title,
                body: d.body,
                time: d.time,
                read: d.read === true,
                routeId: d.routeId as RouteId,
                demo: false,
              },
            ]
          : [];
      });
      next(items);
    },
    error,
  );
}
export async function markNotificationRead(uid: string, id: string) {
  await updateDoc(
    doc(getFirestore(firebaseApp()), "users", uid, "notifications", id),
    { read: true },
  );
}
export function subscribeTelemetry(
  routeId: RouteId,
  next: (value: Telemetry | null) => void,
  error: (message: string) => void,
) {
  return onValue(
    ref(getDatabase(firebaseApp()), `telemetry/${routeId}`),
    (snapshot) => next(parseTelemetry(snapshot.val(), routeId)),
    () => error("No se pudo conectar con el GPS. Intenta nuevamente."),
  );
}
export async function registerPush(uid: string) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY)
    throw new Error("Las notificaciones push aún no están configuradas.");
  const { getMessaging, getToken, isSupported } = await import(
    "firebase/messaging"
  );
  if (!(await isSupported()))
    throw new Error(
      "Este navegador no admite notificaciones push. En iPhone, instala la app en la pantalla de inicio.",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "No se habilitaron las notificaciones. Puedes seguir consultando tus alertas en la app.",
    );
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(firebaseApp()), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  await setDoc(
    doc(getFirestore(firebaseApp()), "users", uid, "devices", token),
    { token, createdAt: Date.now() },
  );
}
export async function unregisterPush(uid: string) {
  const { getMessaging, getToken, deleteToken, isSupported } = await import(
    "firebase/messaging"
  );
  if (
    !(await isSupported()) ||
    !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
    Notification.permission !== "granted"
  )
    return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return;
  const messaging = getMessaging(firebaseApp());
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  const { deleteDoc } = await import("firebase/firestore");
  if (token)
    await deleteDoc(
      doc(getFirestore(firebaseApp()), "users", uid, "devices", token),
    );
  await deleteToken(messaging);
}
