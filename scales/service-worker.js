const CACHE_NAME = 'scales-1.0.7';
const ASSETS = [
  '/scales/',
  '/scales/index.html',
  '/scales/manifest.json',
  '/scales/css/style.css',
  '/scales/js/music.js',
  '/scales/js/notation.js',
  '/scales/js/app.js',
  '/scales/js/themes.js',
  '/scales/js/defaults.js',
  '/scales/icons/icon.svg',
  '/scales/icons/icon-192.png',
  '/scales/icons/icon-512.png',
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
