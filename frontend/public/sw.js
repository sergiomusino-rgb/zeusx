const CACHE_NAME = 'zeusx-app-v1';

// Cache on install
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Network-first per navigazioni HTML e chiamate API, cache-first per asset
// statici. In tutti i casi si cachano solo risposte GET con response.ok:
// una 404/500 transitoria (es. durante un rebuild del dev server) non deve
// restare bloccata in cache per sempre, altrimenti route valide continuano
// a risultare 404 anche dopo che il problema a monte è stato risolto.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  const cachePut = (response) => {
    if (request.method === 'GET' && response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  };

  // Navigazioni HTML - network first: in sviluppo/uso online mostra sempre
  // la versione corrente della route, cade sulla cache solo se offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(cachePut)
        .catch(() => caches.match(request))
    );
    return;
  }

  // API calls - network first (cache only GET + ok requests)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then(cachePut)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets - cache first (only GET + ok requests)
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then(cachePut);
    })
  );
});