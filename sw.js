// 离线缓存（仅在 localhost / HTTPS 等安全上下文下生效）
const CACHE_PREFIX = 'yoyo-words-';
const CACHE = `${CACHE_PREFIX}v18`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/words.js',
  './js/engine.js',
  './js/storage.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

function isWithinAppScope(urlLike) {
  try {
    const url = new URL(urlLike, self.registration.scope);
    const scope = new URL(self.registration.scope);
    return url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  } catch {
    return false;
  }
}

function shouldHandle(request) {
  return request.method === 'GET' && isWithinAppScope(request.url);
}

function shouldCache(request, response) {
  if (!response.ok || response.type === 'opaque' || response.type === 'opaqueredirect') {
    return false;
  }

  const cacheControl = response.headers?.get?.('Cache-Control') || '';
  if (/\bno-store\b/i.test(cacheControl)) return false;

  // A redirect must not smuggle an out-of-scope response into this app's cache.
  return isWithinAppScope(response.url || request.url);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE).then((cache) => cache.addAll(ASSETS)),
      self.skipWaiting(),
    ])
  );
});

// 允许页面主动要求跳过等待。
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// 网络优先：在线时拿最新代码并回填本应用缓存，离线时退回缓存。
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldHandle(request)) return;

  const networkResponse = fetch(request);
  const cacheWrite = networkResponse
    .then((response) => {
      if (!shouldCache(request, response)) return undefined;
      const copy = response.clone();
      return caches.open(CACHE).then((cache) => cache.put(request, copy));
    })
    .catch(() => {});

  // Register waitUntil synchronously while the fetch event is still dispatching.
  event.waitUntil(cacheWrite);
  event.respondWith(
    networkResponse.catch(() =>
      caches.open(CACHE).then((cache) => cache.match(request))
    )
  );
});
