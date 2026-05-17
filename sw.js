const CACHE_NAME = 'hydra-logic-v13';
const ASSETS = [
  './',
  './index.html',
  './levels_tutorial.js',
  './levels_standard.js',
  './levels_cross.js',
  './levels_mixer.js',
  './levels_splitter.js',
  './levels_expert.js',
  './app.js',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force activate immediately
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => caches.delete(key)) // ALWAYS clear old caches immediately on activate
    ))
  );
  self.clients.claim(); // Take control of all pages immediately
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Network ONLY for JS and HTML to ensure immediate updates during dev
  if (event.request.url.includes('.js') || event.request.url.includes('.html')) {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
      );
      return;
  }
  
  // Network first for other assets
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
