// Service Worker tối giản phục vụ PWA cache tĩnh
const CACHE_NAME = 'adsinsight-cache-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './shared/css/style.css',
  './shared/img/favicon.png',
  './shared/vendor/papaparse.min.js',
  './shared/vendor/xlsx.full.min.js',
  './shared/js/sidebar-toggle.js',
  './shared/js/db.js',
  './shared/js/command-palette.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Chỉ cache static requests cùng domain
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});