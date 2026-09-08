// Offline, for the same reason as the first app: this gets opened in a field,
// a gallery, or a canyon. Everything is cached on install and served
// cache-first, so a launch with no signal is the same as a launch with one.
//
// The asset list below is written by tools/bundle.mjs from what the page
// actually references. The first app shipped a hand-kept list and it silently
// fell thirty-six pictures behind.

const CACHE = 'stops-next-v1';

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
  'js/lessons.js',
  'js/gear.js',
  'js/shot.js',
  'js/chips.js',
  'js/app.js',
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
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true })
    .then((hit) => hit ?? fetch(event.request)));
});
