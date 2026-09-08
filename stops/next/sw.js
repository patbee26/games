// Offline, for the same reason as the first app: this gets opened in a field,
// a gallery, or a canyon. Everything is cached on install and served
// cache-first, so a launch with no signal is the same as a launch with one.
//
// The asset list below, and the cache name, are written by tools/bundle.mjs
// from what the page actually references. The first app shipped a hand-kept
// list and it silently fell thirty-six pictures behind, and this one shipped
// six versions under one cache name because bumping it was a thing to remember.
// Neither is a thing to remember any more.

const CACHE = 'stops-next-0000000';   // build:cache

const ASSETS = [
  './',
  'index.html',
  // assets:start, written by tools/bundle.mjs, do not edit by hand
  'styles.css',
  'manifest.webmanifest',
  '../app/fonts.css',
  '../app/js/ladders.js',
  '../app/js/optics.js',
  '../app/js/exposure.js',
  '../app/js/data.js',
  'js/brand.js',
  'js/lessons.js',
  'js/gear.js',
  'js/shot.js',
  'js/chips.js',
  'js/app.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  '../app/fonts/ibm-plex-mono-400.woff2',
  '../app/fonts/ibm-plex-mono-500.woff2',
  '../app/fonts/ibm-plex-sans-condensed-400.woff2',
  '../app/fonts/ibm-plex-sans-condensed-500.woff2',
  '../app/fonts/ibm-plex-sans-condensed-600.woff2',
  '../app/fonts/ibm-plex-sans-condensed-700.woff2',
  '../app/photos/bases/kids.jpg',
  '../app/photos/variants/kids__sh-mid.jpg',
  '../app/photos/variants/kids__sh-slow.jpg',
  '../app/photos/bases/portrait.jpg',
  '../app/photos/variants/portrait__ap-wide.jpg',
  '../app/photos/variants/portrait__ap-mid.jpg',
  '../app/photos/variants/portrait__ap-deep.jpg',
  '../app/photos/variants/portrait__fl-wide.jpg',
  '../app/photos/variants/portrait__fl-norm.jpg',
  '../app/photos/bases/group.jpg',
  '../app/photos/variants/group__ap-wide.jpg',
  '../app/photos/variants/group__ap-mid.jpg',
  '../app/photos/variants/group__ap-deep.jpg',
  '../app/photos/bases/sports.jpg',
  '../app/photos/variants/sports__sh-mid.jpg',
  '../app/photos/variants/sports__sh-slow.jpg',
  '../app/photos/bases/street.jpg',
  '../app/photos/variants/street__ap-wide.jpg',
  '../app/photos/variants/street__ap-mid.jpg',
  '../app/photos/variants/street__ap-deep.jpg',
  '../app/photos/variants/street__fl-wide.jpg',
  '../app/photos/variants/street__fl-long.jpg',
  '../app/photos/bases/landscape.jpg',
  '../app/photos/variants/landscape__fl-norm.jpg',
  '../app/photos/variants/landscape__fl-long.jpg',
  '../app/photos/bases/architecture.jpg',
  '../app/photos/variants/architecture__fl-norm.jpg',
  '../app/photos/variants/architecture__fl-long.jpg',
  '../app/photos/bases/indoor.jpg',
  '../app/photos/variants/indoor__ap-wide.jpg',
  '../app/photos/variants/indoor__ap-mid.jpg',
  '../app/photos/variants/indoor__ap-deep.jpg',
  '../app/photos/bases/food.jpg',
  '../app/photos/variants/food__ap-wide.jpg',
  '../app/photos/variants/food__ap-mid.jpg',
  '../app/photos/variants/food__ap-deep.jpg',
  '../app/photos/bases/nightcity.jpg',
  '../app/photos/variants/nightcity__sh-fast.jpg',
  '../app/photos/variants/nightcity__sh-mid.jpg',
  '../app/photos/bases/water.jpg',
  '../app/photos/variants/water__sh-fast.jpg',
  '../app/photos/variants/water__sh-mid.jpg',
  '../app/photos/bases/panning.jpg',
  '../app/photos/variants/panning__sh-fast.jpg',
  '../app/photos/variants/panning__sh-mid.jpg',
  // assets:end
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // The page itself goes to the network first, and falls back to the cache when
  // there is no signal. Everything else stays cache-first, which is what makes
  // the app open instantly in a canyon.
  //
  // It used to be cache-first for the page too, which meant a deploy was
  // invisible to anybody who had ever opened the site: their browser kept
  // handing them the copy it already had, forever, and no amount of publishing
  // changed it. Offline still works because the fallback below is the same
  // cache it was reading before.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: true })
          .then((hit) => hit ?? caches.match('index.html'))),
    );
    return;
  }

  event.respondWith(caches.match(request, { ignoreSearch: true })
    .then((hit) => hit ?? fetch(request)));
});
