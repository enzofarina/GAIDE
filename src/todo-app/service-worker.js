// Bump this on every change to index.html, style.css, or app.js — activate()
// below deletes any cache that isn't this name, which is how an
// already-installed phone actually picks up a new version (plan.md).
const CACHE_NAME = 'todo-v1';

const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Cache-first for the static shell only — task data lives in localStorage,
// never in this cache, so there's nothing here that can go stale in a way
// that loses data, only in a way that shows an old UI (fixed by bumping
// CACHE_NAME above).
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
