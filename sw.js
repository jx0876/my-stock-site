/* Minimal Service Worker — PWA 必要
   不快取資料 API，只快取靜態檔讓裝桌面 + 離線基本能用 */
const CACHE = 'mf-v1';
const STATIC = [
  './',
  './index.html',
  './assets/saved_resource.js',
  './assets/chart.umd.min.js',
  './assets/chartjs-adapter-date-fns.bundle.min.js',
  './assets/css2.css',
  './assets/my_features.css',
  './assets/my_features.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 資料 API 不快取（要即時）
  if (url.hostname.includes('finmindtrade.com') ||
      url.hostname.includes('twse.com.tw') ||
      url.pathname.includes('api.json')) {
    return;
  }
  // 靜態檔走 cache-first
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
