// Study setup screen: study name, prototype type, screen list, and the
// Start session button (only enabled once the study has a screen).

import { el, replaceChildren } from './dom.js';
import { backupHeader } from './backup-status.js';
import {
  updateStudyDetails, addScreen, renameScreen, moveScreen, removeScreen,
  canStartSession, activeSession, PROTOTYPE_TYPES, PROTOTYPE_TYPE_LABELS,
} from '../model.js';

// Which screen is being renamed; survives a re-render but not a page reload.
let renamingId = null;

export function render(container, ctx, { focus } = {}) {
  const { repo } = ctx;
  let study;
  try {
    study = repo.currentStudy();
  } catch (err) {
    ctx.showStoreError(err);
    study = null;
  }

  if (!study) {
    replaceChildren(container,
      el('p', {}, 'No study is open. ', el('a', { href: '#/studies' }, 'Go to Studies'),
        ' to create or open one.'));
    return;
  }

  // Save the changed study, draw the screen again, then put focus back.
  function commit(errorBox, change, focusAfter, message) {
    ctx.run(errorBox, () => {
      const next = change(study);
      repo.saveStudy(next);
      render(container, ctx, { focus: focusAfter });
      if (message) ctx.announce(message);
    });
  }

  // ----- Details -----
  const nameInput = el('input', {
    id: 'study-name', type: 'text', autocomplete: 'off', maxlength: 200, value: study.name,
    'aria-describedby': 'details-error',
  });
  const typeSelect = el('select', { id: 'study-type', 'aria-describedby': 'details-error' },
    PROTOTYPE_TYPES.map((t) => el('option', { value: t, selected: t === study.prototypeType }, PROTOTYPE_TYPE_LABELS[t])));
  const detailsError = el('p', { id: 'details-error', class: 'error', role: 'alert' });

  function onSaveDetails(event) {
    event.preventDefault();
    commit(detailsError,
      (s) => updateStudyDetails(s, { name: nameInput.value, prototypeType: typeSelect.value }),
      '#save-details', 'Study details saved.');
  }

  // ----- Screens -----
  const screensError = el('p', { id: 'screens-error', class: 'error', role: 'alert' });
  const count = study.screens.length;

  const rows = study.screens.map((screen, index) => {
    const label = `${index + 1}. ${screen.name}`;
    if (screen.id === renamingId) {
      const input = el('input', {
        id: 'rename-input', type: 'text', autocomplete: 'off', maxlength: 200, value: screen.name,
        'aria-label': `New name for screen ${index + 1}`, 'aria-describedby': 'screens-error',
        onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); cancelRename(); } },
      });
      const cancelRename = () => {
        renamingId = null;
        render(container, ctx, { focus: `[data-screen-id="${screen.id}"] .rename` });
      };
      return el('li', { 'data-screen-id': screen.id },
        el('form', {
          class: 'inline', novalidate: true,
          onsubmit: (e) => {
            e.preventDefault();
            ctx.run(screensError, () => {
              repo.saveStudy(renameScreen(study, screen.id, input.value));
              renamingId = null;
              ctx.announce('Screen renamed.');
              render(container, ctx, { focus: `[data-screen-id="${screen.id}"] .rename` });
            });
          },
        },
        el('span', { class: 'num' }, `${index + 1}.`),
        input,
        el('button', { type: 'submit' }, 'Save name'),
        el('button', { type: 'button', onclick: cancelRename }, 'Cancel')));
    }
    return el('li', { 'data-screen-id': screen.id },
      el('span', { class: 'screen-name' }, label),
      el('span', { class: 'actions' },
        el('button', {
          type: 'button', class: 'rename', 'aria-label': `Rename ${screen.name}`,
          onclick: () => { renamingId = screen.id; render(container, ctx, { focus: '#rename-input' }); },
        }, 'Rename'),
        el('button', {
          type: 'button', class: 'up', 'aria-label': `Move ${screen.name} up`, disabled: index === 0,
          onclick: () => commit(screensError, (s) => moveScreen(s, screen.id, index - 1),
            index - 1 === 0 ? `[data-screen-id="${screen.id}"] .down` : `[data-screen-id="${screen.id}"] .up`,
            `${screen.name} moved to position ${index}.`),
        }, 'Move up'),
        el('button', {
          type: 'button', class: 'down', 'aria-label': `Move ${screen.name} down`, disabled: index === count - 1,
          onclick: () => commit(screensError, (s) => moveScreen(s, screen.id, index + 1),
            index + 1 === count - 1 ? `[data-screen-id="${screen.id}"] .up` : `[data-screen-id="${screen.id}"] .down`,
            `${screen.name} moved to position ${index + 2}.`),
        }, 'Move down'),
        el('button', {
          type: 'button', class: 'remove', 'aria-label': `Remove ${screen.name}`,
          onclick: () => commit(screensError, (s) => removeScreen(s, screen.id), '#new-screen-name',
            `Screen "${screen.name}" removed.`),
        }, 'Remove')));
  });

  const newScreenInput = el('input', {
    id: 'new-screen-name', type: 'text', autocomplete: 'off', maxlength: 200,
    'aria-describedby': 'screens-error',
  });

  function onAddScreen(event) {
    event.preventDefault();
    const name = newScreenInput.value;
    commit(screensError, (s) => addScreen(s, name), '#new-screen-name', `Screen "${name.trim()}" added.`);
  }

  // ----- Session -----
  const start = canStartSession(study, repo.listStudies().studies);
  const running = activeSession(study);

  replaceChildren(container,
    el('p', { class: 'context' }, `Round ${study.round}`),
    backupHeader(study, ctx),

    el('h2', {}, 'Details'),
    el('form', { class: 'stack', onsubmit: onSaveDetails, novalidate: true },
      el('div', { class: 'field' }, el('label', { for: 'study-name' }, 'Study name'), nameInput),
      el('div', { class: 'field' }, el('label', { for: 'study-type' }, 'Prototype type'), typeSelect),
      el('div', {}, el('button', { type: 'submit', id: 'save-details' }, 'Save details')),
      detailsError),

    el('h2', { id: 'screens-heading' }, `Screens (${count})`),
    count === 0
      ? el('p', { class: 'empty' }, 'No screens yet. Add the screens you will test, in the order you expect to see them.')
      : el('ol', { class: 'screen-list', 'aria-labelledby': 'screens-heading' }, rows),
    el('form', { class: 'inline', onsubmit: onAddScreen, novalidate: true },
      el('label', { for: 'new-screen-name' }, 'New screen name'),
      newScreenInput,
      el('button', { type: 'submit' }, 'Add screen')),
    screensError,

    el('h2', {}, 'Session'),
    running
      ? [
        el('p', { id: 'start-help', class: 'hint' }, `Session ${running.participantId} is running.`),
        el('button', { type: 'button', id: 'continue-session', class: 'primary', onclick: () => ctx.go('live') },
          'Continue in Live log'),
      ]
      : [
        el('p', { id: 'start-help', class: start.ok ? 'hint' : 'warning' },
          start.ok ? 'Ready. Screens can also be added during the session.' : start.message),
        el('button', {
          type: 'button', id: 'start-session', class: 'primary', disabled: !start.ok,
          'aria-describedby': 'start-help', onclick: () => ctx.go('live'),
        }, 'Start session'),
      ]);

  if (focus) container.querySelector(focus)?.focus();
}
