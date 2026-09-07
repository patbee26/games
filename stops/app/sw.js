// Offline is not a nicety here: this app earns its keep in gyms, canyons and
// aeroplanes. Everything is cached on install and served cache-first, so a
// launch with no signal is indistinguishable from a launch with one.

const CACHE = 'stops-v23';

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
  'js/scenery.js',
  'js/photos.js',
  'js/variants.js',
  'js/variantpick.js',
  'photos/architecture.jpg',
  'photos/concert.jpg',
  'photos/fireworks.jpg',
  'photos/food.jpg',
  'photos/group.jpg',
  'photos/indoor.jpg',
  'photos/kids.jpg',
  'photos/landscape.jpg',
  'photos/macro.jpg',
  'photos/moon.jpg',
  'photos/nightcity.jpg',
  'photos/panning.jpg',
  'photos/portrait.jpg',
  'photos/sports.jpg',
  'photos/stars.jpg',
  'photos/street.jpg',
  'photos/water.jpg',
  'photos/wildlife.jpg',
  'thumbs/architecture.jpg',
  'thumbs/concert.jpg',
  'thumbs/fireworks.jpg',
  'thumbs/food.jpg',
  'thumbs/group.jpg',
  'thumbs/indoor.jpg',
  'thumbs/kids.jpg',
  'thumbs/landscape.jpg',
  'thumbs/macro.jpg',
  'thumbs/moon.jpg',
  'thumbs/nightcity.jpg',
  'thumbs/panning.jpg',
  'thumbs/portrait.jpg',
  'thumbs/sports.jpg',
  'thumbs/stars.jpg',
  'thumbs/street.jpg',
  'thumbs/water.jpg',
  'thumbs/wildlife.jpg',
  // variants:start — written by tools/ingest-variants.mjs, do not edit by hand
  'photos/variants/architecture__fl-long.jpg',
  'photos/variants/architecture__fl-norm.jpg',
  'photos/variants/architecture__fl-wide.jpg',
  'photos/variants/food__ap-deep.jpg',
  'photos/variants/food__ap-mid.jpg',
  'photos/variants/food__ap-wide.jpg',
  'photos/variants/group__ap-deep.jpg',
  'photos/variants/group__ap-mid.jpg',
  'photos/variants/group__ap-wide.jpg',
  'photos/variants/indoor__ap-deep.jpg',
  'photos/variants/indoor__ap-mid.jpg',
  'photos/variants/indoor__ap-wide.jpg',
  'photos/variants/kids__sh-fast.jpg',
  'photos/variants/kids__sh-mid.jpg',
  'photos/variants/kids__sh-slow.jpg',
  'photos/variants/landscape__fl-long.jpg',
  'photos/variants/landscape__fl-norm.jpg',
  'photos/variants/landscape__fl-wide.jpg',
  'photos/variants/nightcity__sh-fast.jpg',
  'photos/variants/nightcity__sh-mid.jpg',
  'photos/variants/nightcity__sh-slow.jpg',
  'photos/variants/panning__sh-fast.jpg',
  'photos/variants/panning__sh-mid.jpg',
  'photos/variants/panning__sh-slow.jpg',
  'photos/variants/portrait__ap-deep.jpg',
  'photos/variants/portrait__ap-mid.jpg',
  'photos/variants/portrait__ap-wide.jpg',
  'photos/variants/portrait__fl-long.jpg',
  'photos/variants/portrait__fl-norm.jpg',
  'photos/variants/portrait__fl-wide.jpg',
  'photos/variants/sports__sh-fast.jpg',
  'photos/variants/sports__sh-mid.jpg',
  'photos/variants/sports__sh-slow.jpg',
  'photos/variants/street__ap-deep.jpg',
  'photos/variants/street__ap-mid.jpg',
  'photos/variants/street__ap-wide.jpg',
  'photos/variants/street__fl-long.jpg',
  'photos/variants/street__fl-norm.jpg',
  'photos/variants/street__fl-wide.jpg',
  'photos/variants/water__sh-fast.jpg',
  'photos/variants/water__sh-mid.jpg',
  'photos/variants/water__sh-slow.jpg',
  // variants:end
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
