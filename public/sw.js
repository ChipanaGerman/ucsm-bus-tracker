const CACHE = 'bus-track-shell-v1';
const STATIC = ['/offline.html', '/icon.svg', '/icon-192.png', '/icon-512.png', '/routes/ruta_norte.jpg', '/routes/ruta_sur.jpg', '/routes/ruta_este.jpg', '/routes/ruta_oeste.jpg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('bus-track-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Nunca almacenar respuestas de sesión, GPS, Firebase o APIs.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  } else if (STATIC.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { return; }
  const data = payload.data || payload;
  event.waitUntil(self.registration.showNotification(data.title || 'UCSM BusTrack', {
    body: data.body || 'Tienes una nueva alerta de transporte.', icon: '/icon-192.png',
    tag: data.tag || 'transport-alert', data: { routeId: data.routeId || 'norte' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const allowed = ['norte', 'sur', 'este', 'oeste'];
  const routeId = allowed.includes(event.notification.data?.routeId) ? event.notification.data.routeId : 'norte';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const url = `${self.location.origin}/?route=${routeId}`;
    const client = clients.find(client => client.url.startsWith(self.location.origin));
    if (client) { await client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});
