// EXA Models Service Worker
//
// Deliberately minimal: the ONLY job is an offline fallback page for
// navigations. Do not intercept scripts, styles, images, or Next.js RSC/data
// fetches — iOS Safari kills and restarts service workers aggressively, and a
// fetch handler that catches those failures ends up converting transient
// blips into synthetic 503s that Next.js renders as "Something went wrong"
// error screens (mid-2026 mobile error wave). The browser HTTP cache and CDN
// already handle static asset caching.
const CACHE_NAME = 'exa-models-v2';

const STATIC_ASSETS = [
  '/offline.html',
  '/exa-logo-white.png',
  '/apple-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Full-page navigations only; let the browser handle everything else.
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match('/offline.html').then((cachedResponse) => {
        return cachedResponse || new Response('Offline', { status: 503 });
      });
    })
  );
});
