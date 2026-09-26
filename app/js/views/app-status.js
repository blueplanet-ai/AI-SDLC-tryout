// Offline copy and the two notes at the top of every screen (step 10, D29):
// - "New version available — Reload" when a newer app is ready. The app never
//   reloads by itself; only the Reload button does, also during a session
//   (the session and the half-typed note come back after the reload).
// - "Offline — your work is saved on this laptop" while there is no internet.

export function startAppStatus() {
  showOfflineNote();
  keepOfflineCopy();
}

function showOfflineNote() {
  const note = document.getElementById('offline-note');
  const update = () => { note.hidden = navigator.onLine; };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

async function keepOfflineCopy() {
  if (!('serviceWorker' in navigator)) return;
  let registration;
  try {
    registration = await navigator.serviceWorker.register('sw.js');
  } catch {
    // E.g. a private window that refuses it: the app still works, just not offline.
    return;
  }

  const banner = document.getElementById('update-banner');
  let reloadPressed = false;

  // Only a newer version counts, not the first copy saved on a first visit.
  const offerNewVersion = () => {
    if (registration.waiting && navigator.serviceWorker.controller) banner.hidden = false;
  };
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') offerNewVersion();
    });
  });
  offerNewVersion();

  banner.querySelector('button').addEventListener('click', () => {
    reloadPressed = true;
    // Another tab may already have switched to the new version.
    if (registration.waiting) registration.waiting.postMessage('use-new-version');
    else location.reload();
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadPressed) location.reload();
  });

  // The browser checks for a new version when the app opens; also check when
  // the note-taker comes back to the tab or the internet returns.
  const check = () => {
    if (navigator.onLine) registration.update().catch(() => {});
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.addEventListener('online', check);
}
