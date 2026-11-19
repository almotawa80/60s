// network-first: always fetch the newest files, fall back to cache when offline
const CACHE = 'tahaddi-v29';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(r, { cache: 'no-cache' }).then(res => {
      const c = res.clone(); caches.open(CACHE).then(ch => ch.put(r, c)); return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('index.html')))
  );
});
