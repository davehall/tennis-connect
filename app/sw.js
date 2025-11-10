// Simple service worker to cache local images (logos, previews) and gently deter
// direct access to the raw data file. Note: this cannot intercept cross-origin
// favicons (https://domain.tld/favicon.ico).

// Bump this version when you change any cached shell asset so old caches purge.
// Updated from v7 -> v8 to force clients to refresh cached app assets after
// the recent app.js rebuild (map maxZoom and other fixes).
const CACHE_NAME = 'tcm-assets-v8';
const PRECACHE_ASSETS = [
  '/',
  '/images/favicon_fallback.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(()=>{})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Cleanup old caches
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request)
      .then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(()=>{});
        return resp;
      })
      .catch(() => caches.match('/images/favicon_fallback.png'));
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Soft-protect the raw data files from direct navigation or hotlinking.
  const isDataFile = (url.origin === location.origin) && (
    url.pathname.endsWith('/clubs.js') ||
    url.pathname === '/assets/data/rk7a9nq3.js' ||
    url.pathname === '/assets/data/rk7a9nq3.b64.txt'
  );
  if (isDataFile) {
    const dest = event.request.destination;
    const ref = event.request.referrer || '';
    // Block direct navigation (opening clubs.js in a tab)
    if (dest === 'document') {
      event.respondWith(new Response('Not found', { status: 404 }));
      return;
    }
    // Allow script requests only when coming from our app pages
    const allowed = ref.includes('/search') || ref.includes('/search/') || ref.includes('/index.html') || ref === location.origin + '/' || ref.startsWith(location.origin);
    if (!allowed) {
      event.respondWith(new Response('', { status: 403 }));
      return;
    }
  }

  // Cache-first for same-origin images (logos, previews, ui assets)
  const isLocalImage = (event.request.destination === 'image') && (url.origin === location.origin);
  if (isLocalImage) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Remote favicon caching removed (privacy / determinism). No special handling.
});
