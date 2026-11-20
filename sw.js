// fast start: versioned files (?v=) and CDN libraries come from cache instantly;
// pages are network-first with a short timeout, falling back to cache when slow or offline
const CACHE = 'tahaddi-v104';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
const put = (r, res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(r, c)); } return res; };
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const cdn = u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (u.origin !== location.origin && !cdn) return;
  if (cdn || u.searchParams.has('v')) {
    // cache-first; refresh CDN copies in the background
    e.respondWith(caches.match(r).then(m => {
      if (m && !cdn) return m;
      const net = fetch(r).then(res => put(r, res));
      if (m) { e.waitUntil(net.catch(() => {})); return m; }
      return net;
    }));
    return;
  }
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(r).then(m => m || caches.match('index.html'));
    const t = setTimeout(() => fallback().then(m => { if (m && !done) { done = true; resolve(m); } }), 2500);
    fetch(r, { cache: 'no-cache' }).then(res => { put(r, res); clearTimeout(t); if (!done) { done = true; resolve(res); } })
      .catch(() => { clearTimeout(t); fallback().then(m => { if (!done) { done = true; resolve(m || Response.error()); } }); });
  }));
});
