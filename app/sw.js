// Service worker: keeps a copy of the app's files in this browser, so the app
// opens without internet after one visit (spec 4.3, step 10, D29).

// Set automatically when the app is published (D29): the publish workflow
// replaces 'dev' with the commit it publishes. Never change it by hand.
const CACHE_VERSION = 'dev';

// Other sites on blueplanet-ai.github.io share this browser's saved copies,
// so only the ones starting with this prefix are ours to create or delete.
const CACHE_PREFIX = 'tsn-app-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Published app: open from the saved copy (fast, and works offline); a newer
// version waits until the note-taker presses Reload. Local testing ('dev'):
// always load the newest files while the server runs; the copy is for offline.
const RELEASED = CACHE_VERSION !== 'dev';

// Every file in app/ except this one (a robot test checks the list is complete).
const FILES = [
  './',
  'index.html',
  'styles.css',
  'favicon.svg',
  'js/backup.js',
  'js/keyboard.js',
  'js/main.js',
  'js/model.js',
  'js/persist.js',
  'js/repo.js',
  'js/store.js',
  'js/summary.js',
  'js/views/app-status.js',
  'js/views/backup-status.js',
  'js/views/dom.js',
  'js/views/download.js',
  'js/views/export.js',
  'js/views/feedback.js',
  'js/views/live.js',
  'js/views/review.js',
  'js/views/setup.js',
  'js/views/studies.js',
  'js/views/summary.js',
];

self.addEventListener('install', (event) => {
  // 'reload' skips the browser's short-term memory of files, so a new version
  // never saves an older file by mistake.
  event.waitUntil(caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))));
});

// Sent only when the note-taker presses Reload in the "New version" banner.
self.addEventListener('message', (event) => {
  if (event.data === 'use-new-version') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith(RELEASED ? savedFirst(request) : newestFirst(request));
});

async function savedCopy(request) {
  const cache = await caches.open(CACHE_NAME);
  // "?..." after an address does not change which file is meant.
  return cache.match(request, { ignoreSearch: true });
}

async function savedFirst(request) {
  return (await savedCopy(request)) ?? fetch(request);
}

async function newestFirst(request) {
  try {
    const response = await fetch(request.url, { cache: 'no-cache' });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request.url, response.clone());
    }
    return response;
  } catch (err) {
    const saved = await savedCopy(request);
    if (saved) return saved;
    throw err;
  }
}
