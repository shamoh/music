const CACHE_NAME = 'scales-1.0.55';
const ASSETS = [
  '/',
  '/index.html',
  '/history.html',
  '/license.html',
  '/fonts/Bravura-OFL.txt',
  '/manifest.json',
  '/css/style.css',
  '/fonts/ScalesMusic.woff',
  '/js/music.js',
  '/js/notation.js',
  '/js/app.js',
  '/js/themes.js',
  '/js/defaults.js',
  '/js/apply-saved-profile-vars.js',
  '/js/app-footer.js',
  '/js/settings-menu.js',
  '/js/site-header.js',
  '/js/site-layout.js',
  '/js/analytics.js',
  '/js/metronome.js',
  '/js/fingering.js',
  '/js/fingering-diagram.js',
  '/js/note-highlight.js',
  '/js/page-keys.js',
  '/js/swipe-gesture.js',
  '/js/scale-nav.js',
  '/js/scale-filters.js',
  '/js/service-worker-registration.js',
  '/js/instrument/saxophone/keys.js',
  '/js/instrument/saxophone/fingerings.js',
  '/js/instrument/saxophone/alto/instrument.js',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/scales/',
  '/scales/index.html',
  '/scales/instrument/saxophone/alto/',
  '/scales/instrument/saxophone/alto/index.html',
  '/scales/instrument/saxophone/alto/app.js',
  '/scales/instrument/saxophone-alto/',
  '/scales/instrument/saxophone-alto/index.html',
  '/metronome/',
  '/metronome/index.html',
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
