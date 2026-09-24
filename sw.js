/* Service worker : l'app fonctionne hors connexion.
   Stratégie « réseau d'abord » : on sert toujours la dernière version publiée quand le réseau
   est disponible, et la copie locale sinon. Le nom du cache est mis à jour à chaque commit. */
const CACHE = 'kata-20260924-234052';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  ...['store', 'utils', 'kanban', 'properties', 'view-settings', 'icons', 'templates', 'page', 'demo', 'storyboard', 'timeblock', 'diagrams', 'main'].map(n => `js/${n}.js`),
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kata-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
