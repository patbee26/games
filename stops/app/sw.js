// Offline is not a nicety here: this app earns its keep in gyms, canyons and
// aeroplanes. Everything is cached on install and served cache-first, so a
// launch with no signal is indistinguishable from a launch with one.

const CACHE = 'stops-v11';

const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'fonts.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/data.js',
  'js/exposure.js',
  'js/gear.js',
  'js/icons.js',
  'js/ladders.js',
  'js/optics.js',
  'js/preview.js',
  'js/sun.js',
  'js/craft.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'fonts/ibm-plex-sans-condensed-400.woff2',
  'fonts/ibm-plex-sans-condensed-500.woff2',
  'fonts/ibm-plex-sans-condensed-600.woff2',
  'fonts/ibm-plex-sans-condensed-700.woff2',
  'fonts/ibm-plex-mono-400.woff2',
  'fonts/ibm-plex-mono-500.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('index.html'));
    }),
  );
});
