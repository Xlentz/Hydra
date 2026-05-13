const CACHE_NAME = 'hydra-logic-dynamic';
const ASSETS = [
  './',
  './index.html',
  './levels.js',
  './app.js',
  './logo.png',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Network-First Strategie
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Update Cache, wenn das Netzwerk antwortet
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        // Fallback auf den Cache, wenn wir Offline sind
        return caches.match(event.request);
      })
  );
});
