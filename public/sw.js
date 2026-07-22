// EXA Models Service Worker
//
// Two jobs only: an offline fallback page for navigations, and web push
// (push + notificationclick below — additive listeners, fully independent of
// fetch). Do not intercept scripts, styles, images, or Next.js RSC/data
// fetches — iOS Safari kills and restarts service workers aggressively, and a
// fetch handler that catches those failures ends up converting transient
// blips into synthetic 503s that Next.js renders as "Something went wrong"
// error screens (mid-2026 mobile error wave). The browser HTTP cache and CDN
// already handle static asset caching.
const CACHE_NAME = 'exa-models-v3';

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

// Web push. Payload is JSON from lib/push.ts:
// { title, body, url?, tag? } — url is an in-app path for notificationclick.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'EXA Models', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'EXA Models', {
      body: payload.body || '',
      icon: '/apple-icon.png',
      badge: '/apple-icon.png',
      tag: payload.tag || undefined,
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = (event.notification.data && event.notification.data.url) || '/';
  let targetUrl;
  try {
    targetUrl = new URL(rawUrl, self.location.origin);
  } catch {
    targetUrl = new URL('/', self.location.origin);
  }
  if (targetUrl.origin !== self.location.origin) {
    // Only same-origin deep links; anything else falls back home
    targetUrl = new URL('/', self.location.origin);
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          // Already open on the target page — just focus it
          if (client.url === targetUrl.href && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl.href);
      })
  );
});
