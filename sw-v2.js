const CACHE = 'world69-shell-v22';
const SHELL = ['./', './index.html', './radar.html', './radar.css', './radar.js', './codelab.html', './conta.html', './login.html', './admin.html', './firebase-config.js', './admin-access.js', './style.css', './codelab.css', './codelab-ide.css', './responsive.css', './codelab.js', './codelab-missions.js', './codelab-ide.js', './codelab-storage.js', './codelab-curriculum.js', './codelab-runner.js', './free-products.js', './free-products.generated.js', './manifest.webmanifest', './assets/favicon.svg', './assets/world69-commercial.mp4', './assets/world69-commercial-poster.jpg'];
const RADAR_DATA_FILES = ['/radar.generated.json', '/radar-details.generated.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('world69-shell-') && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  const requestUrl = new URL(event.request.url);
  if (RADAR_DATA_FILES.some((path) => requestUrl.pathname.endsWith(path))) {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (!response.ok) return (await caches.match(event.request)) || response;
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || new Response('{"schemaVersion":1,"items":[],"sources":[]}', {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    }))));
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
