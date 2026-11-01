/* Service worker: cache every file on install, then serve cache-first so the app works offline.
   Bump CACHE when you change any file so phones pick up the new version. */
var CACHE = '5k-training-v1';
var FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'dates.js', 'calc.js', 'timer.js', 'plan.js', 'stats.js', 'badges.js',
  'ics.js', 'gps.js', 'ui.js', 'charts.js', 'share.js', 'metronome.js', 'v-today.js', 'v-run.js', 'v-plan.js', 'v-log.js', 'v-progress.js',
  'v-race.js', 'v-more.js', 'v-settings.js', 'v-badges.js', 'v-tools.js', 'v-stretch.js', 'v-shoes-body.js', 'v-tips.js', 'onboarding.js',
  'app.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon.svg', 'icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).catch(function () { return e.request.mode === 'navigate' ? caches.match('index.html') : Response.error(); });
  }));
});
