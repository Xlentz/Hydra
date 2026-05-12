const CACHE_NAME = 'hydra-logic-v1';
const ASSETS = [
  './',
  './index.html',
  './levels.js',
  './app.js',
  './logo.png',
  'https://cdn.tailwindcss.com'
];

// Installation: Dateien in den Cache laden
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Strategie: Erst Cache, dann Netzwerk
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
