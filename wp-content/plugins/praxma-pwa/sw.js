const CACHE_NAME = 'praxma-native-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/?mode=webapp']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Stale-while-revalidate: sirve rápido, actualiza en fondo
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

// ESCUCHA DE CLONACIÓN AUTOMÁTICA
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLONE_POSTS') {
    const cacheName = CACHE_NAME;
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(cacheName).then((cache) => {
        return Promise.all(
          urls.map(url => {
            return cache.match(url).then(existing => {
              if (!existing) {
                return fetch(url).then(res => cache.put(url, res));
              }
            });
          })
        );
      })
    );
  }
});

