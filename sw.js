/* sw.js — offline support.
   Everything the site needs (app files + the whole question bank, ~1.8 MB) is cached on first visit,
   so the site opens and works with no network. Same-origin files are served from the cache straight
   away and refreshed in the background, so corrections to questions reach users on their next visit.
   Bump CACHE only to force-drop old files (normally not needed). */
const CACHE = 'tnpsc-g4-v1';
const FONT_CACHE = 'tnpsc-g4-fonts-v1';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/config.js',
  'js/storage.js',
  'js/quiz.js',
  'js/share.js',
  'js/app.js',
  'data/manifest.json',
  'data/gen_pyq_2024.json',
  'data/gen_pyq_2025.json',
  'data/gen_pyq_2022.json',
  'data/gen_new.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' skips the HTTP cache so the first offline copy is fresh
      .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts (Tamil font): cache-first; the font files never change at a given URL
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      } catch (err) { return hit || Response.error(); }
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;   // e.g. visit counter: leave alone

  // Same-origin: stale-while-revalidate. Version query strings (?v=…) are ignored for matching.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true}) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    const network = fetch(req, {cache: 'no-store'}).then(res => {
      if (res.ok) c.put(req.mode === 'navigate' ? 'index.html' : new Request(url.origin + url.pathname), res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(network); return hit; }
    const res = await network;
    return res || new Response('Offline', {status: 503, headers: {'Content-Type': 'text/plain'}});
  }));
});
