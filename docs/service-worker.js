const CACHE_NAME = 'scales-1.0.39';
const ASSETS = [
  '/',
  '/index.html',
  '/history.html',
  '/manifest.json',
  '/css/style.css',
  '/js/music.js',
  '/js/notation.js',
  '/js/app.js',
  '/js/themes.js',
  '/js/defaults.js',
  '/js/analytics.js',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/scales/',
  '/scales/index.html',
  '/scales/instrument/saxophone-alto/',
  '/scales/instrument/saxophone-alto/index.html',
  '/scales/instrument/saxophone-alto/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
