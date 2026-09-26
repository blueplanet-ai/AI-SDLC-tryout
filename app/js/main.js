// Starts the app and shows one screen at a time, chosen by the address bar
// (e.g. "#/live"), so the Back button works and a reload keeps the screen.

import { createStore, StoreError } from './store.js';
import { createRepo } from './repo.js';
import { ModelError } from './model.js';
import { askToKeepData } from './persist.js';
import { startAppStatus } from './views/app-status.js';
import * as studiesView from './views/studies.js';
import * as setupView from './views/setup.js';
import * as liveView from './views/live.js';
import * as reviewView from './views/review.js';
import * as summaryView from './views/summary.js';

const SCREENS = ['studies', 'setup', 'live', 'review', 'summary'];
const DEFAULT_SCREEN = 'studies';
const VIEWS = {
  studies: studiesView, setup: setupView, live: liveView, review: reviewView, summary: summaryView,
};

let keepStatus = false;
const appError = document.getElementById('app-error');
const status = document.getElementById('status');

function showAppError(message) {
  appError.textContent = message;
  appError.hidden = false;
}

function showStoreError(err) {
  if (!(err instanceof StoreError)) throw err;
  showAppError(`Could not read or save data in this browser: ${err.message}`);
}

const ctx = {
  repo: createRepo(createStore()),

  // Runs `action`; a broken rule is shown in `errorBox`, a storage problem at the top.
  run(errorBox, action) {
    errorBox.textContent = '';
    try {
      action();
    } catch (err) {
      if (err instanceof ModelError) errorBox.textContent = err.message;
      else showStoreError(err);
    }
  },

  // Short confirmation such as "Screen added." (also read out by screen readers).
  announce(message) {
    status.textContent = message;
  },

  showStoreError,

  // Switch screen from code; a message just announced stays visible.
  go(name) {
    keepStatus = true;
    if (location.hash === `#/${name}`) show(name, { moveFocus: true });
    else location.hash = `#/${name}`;
  },
};

function screenFromHash(hash) {
  const name = hash.startsWith('#/') ? hash.slice(2) : '';
  return SCREENS.includes(name) ? name : DEFAULT_SCREEN;
}

function show(name, { moveFocus }) {
  if (!keepStatus) status.textContent = '';
  keepStatus = false;
  for (const section of document.querySelectorAll('[data-screen]')) {
    section.hidden = section.dataset.screen !== name;
  }
  for (const link of document.querySelectorAll('.app-header nav a')) {
    if (link.getAttribute('href') === `#/${name}`) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
  // Only the visible screen has content, so hidden forms never clash with it.
  for (const body of document.querySelectorAll('[data-body]')) {
    if (body.dataset.body !== name) body.replaceChildren();
  }
  const view = VIEWS[name];
  // A screen may name the box to start in (e.g. the Live log note box).
  const startIn = view ? view.render(document.querySelector(`[data-body="${name}"]`), ctx) : undefined;
  const heading = document.getElementById(`h-${name}`);
  document.title = `${heading.textContent} – Test-session notes`;
  // Otherwise tell screen-reader and keyboard users where they landed.
  if (startIn) startIn.focus();
  else if (moveFocus) heading.focus();
}

function onHashChange() {
  // Plain anchors such as the "Skip to content" link are not screens.
  if (!location.hash.startsWith('#/')) return;
  show(screenFromHash(location.hash), { moveFocus: true });
}

window.addEventListener('hashchange', onHashChange);
show(screenFromHash(location.hash), { moveFocus: false });

// Step 10: offline copy, "New version available" banner and offline note.
startAppStatus();

// C3(d): once there is data, ask the browser to keep it (also when the app
// reopens straight into another screen).
try {
  if (ctx.repo.listStudies().studies.length > 0) askToKeepData();
} catch (err) {
  showStoreError(err);
}
