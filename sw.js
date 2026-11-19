// Offline support: cache the app shell; serve from cache first, refresh in background.
// Bump VERSION whenever app files change so tablets pick up the update.
const VERSION = 'soillog-v1';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/vocab.js', './js/model.js', './js/store.js', './js/formf.js', './js/svg.js', './js/pdf.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(ev.request, { ignoreSearch: true });
    const net = fetch(ev.request).then(res => { if (res.ok) cache.put(ev.request, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('Offline', { status: 503 });
  }));
});
