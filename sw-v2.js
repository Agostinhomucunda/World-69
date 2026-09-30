const CACHE = 'world69-shell-v8';
const SHELL = ['./', './index.html', './codelab.html', './conta.html', './login.html', './admin.html', './firebase-config.js', './admin-access.js', './style.css', './codelab.css', './codelab-ide.css', './codelab.js', './codelab-ide.js', './codelab-storage.js', './codelab-curriculum.js', './codelab-runner.js', './free-products.js', './free-products.generated.js', './manifest.webmanifest', './assets/favicon.svg', './assets/world69-commercial.mp4', './assets/world69-commercial-poster.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
