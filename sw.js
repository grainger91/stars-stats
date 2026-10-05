/*
  Offline helper for the live app ("service worker").
  It keeps a copy of the app's files on the iPad, so the app opens at the rink with no internet.
  Only the app itself is kept here. Stats are stored separately on the iPad and never sent anywhere.

  When the app is updated: change APP_VERSION below (and in index.html). The iPad picks up the new
  version the next time the app is opened with internet, and uses it from the following open.
*/
const APP_VERSION = '2026-10-05.1';
const CACHE = `stars-live-${APP_VERSION}`;
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

// Remove copies of older versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('stars-live-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Answer from the saved copy straight away (rink wifi is often poor), and refresh the saved copy in the background.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const saved = await cache.match(request, { ignoreSearch: true });
    const fresh = fetch(request)
      .then(response => { if (response.ok) cache.put(request, response.clone()); return response; })
      .catch(() => null);
    if (saved) { event.waitUntil(fresh); return saved; }
    return (await fresh) || (request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});
