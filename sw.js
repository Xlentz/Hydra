const CACHE_NAME = 'hydra-logic-v4'; // Version erhöht für sauberen Übergang
const ASSETS = [
  './',
  './index.html',
  './levels.js',
  './app.js',
  'https://cdn.tailwindcss.com'
];

// Installieren und Assets cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS);
    })
  );
  // Zwingt den einziehenden Service Worker, sofort aktiv zu werden
  self.skipWaiting();
});

// Alten Cache aufräumen, falls sich der CACHE_NAME ändert
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Sorgt dafür, dass geöffnete Tabs sofort kontrolliert werden
  return self.clients.claim();
});

// Strategie: Stale-While-Revalidate (Schneller Start + Hintergrund-Update)
self.addEventListener('fetch', event => {
  // Nur HTTP(S) Anfragen cachen (schließt Browser-Erweiterungen aus)
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.startsWith('https://cdn.tailwindcss.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Netzwerk-Anfrage parallel starten
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Wenn die Antwort gültig ist, den Cache aktualisieren
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline-Fallback: Wenn Netzwerk fehlschlägt, ist das nicht schlimm
        });

        // Sofort die gecachte Version zurückgeben (falls vorhanden), ansonsten auf das Netzwerk warten
        return cachedResponse || fetchPromise;
      });
    })
  );
});
