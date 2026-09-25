// Starts the app and shows one screen at a time, chosen by the address bar
// (e.g. "#/live"), so the Back button works and a reload keeps the screen.

const SCREENS = ['studies', 'setup', 'live', 'review', 'summary'];
const DEFAULT_SCREEN = 'studies';

function screenFromHash(hash) {
  const name = hash.startsWith('#/') ? hash.slice(2) : '';
  return SCREENS.includes(name) ? name : DEFAULT_SCREEN;
}

function show(name, { moveFocus }) {
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
  const heading = document.getElementById(`h-${name}`);
  document.title = `${heading.textContent} – Test-session notes`;
  // Tell screen-reader and keyboard users where they landed.
  if (moveFocus) heading.focus();
}

function onHashChange() {
  // Plain anchors such as the "Skip to content" link are not screens.
  if (!location.hash.startsWith('#/')) return;
  show(screenFromHash(location.hash), { moveFocus: true });
}

window.addEventListener('hashchange', onHashChange);
show(screenFromHash(location.hash), { moveFocus: false });
