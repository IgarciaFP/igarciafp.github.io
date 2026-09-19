const CACHE_NAME = 'opsboard-lab-v2';
const APP_SHELL = [
  './p0101_v2.html',
  './p0101_v2_data.json',
  './p0101_v2.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  const labFiles = new Set(['p0101_v2.html', 'p0101_v2_data.json', 'p0101_v2.webmanifest', 'p0101_v2_sw.js']);
  const fileName = requestUrl.pathname.split('/').pop();
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin || !labFiles.has(fileName)) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
