const CACHE_NAME = 'myshift-v159';

self.addEventListener('install', event => {
  // 新 SW 等使用者下次開啟 app 才接管，避免操作中被打斷
  // 若需要立即更新，可透過 postMessage('SKIP_WAITING') 主動觸發
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  url.search = '';
  const cacheKey = url.toString();

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(cacheKey, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(cacheKey)
          .then(cached => cached || caches.match(url.origin + url.pathname.replace(/[^\/]*$/, 'index.html')));
      })
  );
});
