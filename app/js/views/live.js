// Live log screen (FR2, FR3). Without a running session it shows the
// "Start a session" form with the next participant ID filled in. With one,
// it shows the top bar (study, participant, timer, End session), the screen
// chips, the pain/positive toggle, the note box and the recent findings.
// Shortcuts come from keyboard.js; the rules from model.js.

import { el, replaceChildren } from './dom.js';
import { exportStudy } from './export.js';
import { backupStatusLine } from './backup-status.js';
import { shortcutFor } from '../keyboard.js';
import {
  findActiveSession, canStartSession, startSession, endSession, suggestNextParticipantId,
  validateParticipantId, isParticipantIdUsed, findScreen, findOrAddScreen, addFinding,
  editFinding, recentFindings, participantOfFinding, toggleFindingType,
} from '../model.js';

const TYPE_LABELS = { pain: 'Pain point', positive: 'Positive moment' };
const RECENT_COUNT = 5;
const SHORTCUT_SCREENS = 9;

// What the note-taker picked; survives re-drawing the screen, not a reload
// (after a reload it comes back from the saved draft).
let ui = { sessionId: null, screenId: null, type: 'pain', editingId: null };
// The key handler of the session on screen; null when there is none.
let onShortcut = null;

// One listener for the whole page, so shortcuts work wherever focus is on this screen.
document.addEventListener('keydown', (event) => {
  if (onShortcut) onShortcut(event);
});

// Draws the screen. Returns the element that should get focus.
export function render(container, ctx, { focus } = {}) {
  onShortcut = null;
  const { repo } = ctx;
  let studies;
  let study;
  try {
    studies = repo.listStudies().studies;
    const running = findActiveSession(studies);
    // D12: a running session always wins, so it resumes after the browser is reopened.
    if (running) {
      if (repo.currentStudyId() !== running.study.id) repo.setCurrentStudyId(running.study.id);
      return finishRender(container, focus,
        renderSession(container, ctx, running.study, running.session));
    }
    study = repo.currentStudy();
  } catch (err) {
    ctx.showStoreError(err);
    study = null;
  }

  if (!study) {
    replaceChildren(container,
      el('p', {}, 'No study is open. ', el('a', { href: '#/studies' }, 'Go to Studies'),
        ' to create or open one.'));
    return undefined;
  }
  return finishRender(container, focus, renderStart(container, ctx, study, studies));
}

function finishRender(container, focus, defaultFocus) {
  if (focus) {
    container.querySelector(focus)?.focus();
    return undefined;
  }
  return defaultFocus;
}

// ---------- No session running: start one (FR2) ----------

function renderStart(container, ctx, study, studies) {
  const { repo } = ctx;
  const allowed = canStartSession(study, studies);
  const suggested = suggestNextParticipantId(study);

  const input = el('input', {
    id: 'participant', type: 'text', autocomplete: 'off', spellcheck: 'false', maxlength: 20,
    value: suggested, 'aria-describedby': 'participant-help participant-warning participant-error',
    oninput: () => updateWarning(),
  });
  const warning = el('p', { id: 'participant-warning', class: 'warning', hidden: true });
  const error = el('p', { id: 'participant-error', class: 'error', role: 'alert' });

  // D5: an ID used before in this study is allowed, with a warning.
  function updateWarning() {
    const checked = validateParticipantId(input.value);
    const used = checked.ok && isParticipantIdUsed(study, checked.id);
    warning.hidden = !used;
    warning.textContent = used ? `${checked.id} was already used in this study. You can still start.` : '';
  }

  function onStart(event) {
    event.preventDefault();
    ctx.run(error, () => {
      const { study: next, sessionId } = startSession(study, input.value);
      repo.saveStudy(next);
      repo.setCurrentStudyId(next.id);
      repo.clearDraft();
      ui = { sessionId, screenId: next.screens[0].id, type: 'pain', editingId: null };
      const session = next.sessions.find((s) => s.id === sessionId);
      ctx.announce(`Session ${session.participantId} started.`);
      render(container, ctx, { focus: '#note' });
    });
  }

  replaceChildren(container,
    el('p', { class: 'context' }, `${study.name} · Round ${study.round}`),
    backupStatusLine(study),
    el('h2', {}, 'Start a session'),
    allowed.ok ? null : el('p', { id: 'start-blocked', class: 'warning' }, allowed.message, ' ',
      study.screens.length === 0 ? el('a', { href: '#/setup' }, 'Go to Study setup') : null),
    el('form', { class: 'stack', onsubmit: onStart, novalidate: true },
      el('div', { class: 'field' },
        el('label', { for: 'participant' }, 'Participant ID'),
        input,
        el('p', { id: 'participant-help', class: 'hint' }, 'P followed by a number, like P1 or P12. No names or other details.')),
      warning,
      el('div', {}, el('button', { type: 'submit', class: 'primary', disabled: !allowed.ok }, 'Start session')),
      error));

  return input;
}

// ---------- Session running: log findings (FR3) ----------

function renderSession(container, ctx, study, session) {
  const { repo } = ctx;

  // A different session than last time (or a reload): pick up the saved draft.
  const draft = repo.loadDraft(session.id);
  if (ui.sessionId !== session.id) {
    ui = {
      sessionId: session.id,
      screenId: draft?.screenId,
      type: draft?.type === 'positive' ? 'positive' : 'pain',
      editingId: null,
    };
  }
  if (!findScreen(study, ui.screenId)) ui.screenId = study.screens[0]?.id ?? null;

  const screenError = el('p', { id: 'screen-error', class: 'error', role: 'alert' });
  const noteError = el('p', { id: 'note-error', class: 'error', role: 'alert' });

  // ----- Top bar -----
  const timer = el('span', { id: 'timer', role: 'timer' }, formatDuration(Date.now() - Date.parse(session.startedAt)));
  const tick = setInterval(() => {
    if (!timer.isConnected) { clearInterval(tick); return; }
    timer.textContent = formatDuration(Date.now() - Date.parse(session.startedAt));
  }, 1000);

  // D13 + D17 + D24: one dialog confirms the end and offers a backup at the same time.
  function askEndSession(event) {
    const opener = event.currentTarget;
    const dialogError = el('p', { class: 'error', role: 'alert' });
    let ended = false;

    function end(withBackup) {
      ctx.run(dialogError, () => {
        repo.saveStudy(endSession(study, session.id));
        // The backup is made after ending, so the file includes the end time.
        const fileName = withBackup ? exportStudy(repo, study.id) : null;
        repo.clearDraft();
        ended = true;
        ui = { sessionId: null, screenId: null, type: 'pain', editingId: null };
        dialog.close();
        render(container, ctx, { focus: '#participant' });
        ctx.announce(fileName
          ? `Session ${session.participantId} ended. Backup saved as ${fileName} in your Downloads folder.`
          : `Session ${session.participantId} ended.`);
      });
    }

    const cancel = el('button', { type: 'button', onclick: () => dialog.close() }, 'Cancel');
    const dialog = el('dialog', { class: 'confirm', 'aria-labelledby': 'end-title', 'aria-describedby': 'end-desc' },
      el('h2', { id: 'end-title' }, `End session for ${session.participantId}?`),
      el('p', { id: 'end-desc' }, 'An ended session cannot be continued. '
        + 'Browser storage can be lost, so keep a backup file of this study.'),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'primary', onclick: () => end(true) }, 'End and export backup'),
        el('button', { type: 'button', onclick: () => end(false) }, 'End'),
        cancel),
      dialogError);
    // Cancel or Escape: remove the dialog and go back to the End session button.
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (!ended && opener.isConnected) opener.focus();
    });
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  }

  const bar = el('div', { class: 'live-bar' },
    el('p', {}, el('strong', {}, study.name), ` · Round ${study.round}`),
    el('p', {}, 'Participant ', el('strong', { id: 'current-participant' }, session.participantId)),
    el('p', {}, 'Session time ', timer),
    backupStatusLine(study),
    el('button', { type: 'button', id: 'end-session', onclick: askEndSession }, 'End session'));

  // ----- Note box (made early: the pickers save the draft from it) -----
  const noteBox = el('textarea', {
    id: 'note', rows: 3, value: draft?.note ?? '',
    'aria-describedby': 'current-selection note-help note-reminder note-error',
    oninput: () => saveDraft(),
    onkeydown: (event) => {
      if (shortcutFor(event)?.action === 'save') {
        event.preventDefault();
        saveFinding();
      }
    },
  });

  function saveDraft() {
    try {
      repo.saveDraft({ sessionId: session.id, note: noteBox.value, screenId: ui.screenId, type: ui.type });
    } catch (err) {
      ctx.showStoreError(err);
    }
  }

  // ----- Screen chips (Alt+1…9) and search box (Alt+S) -----
  const chips = study.screens.map((screen, index) => el('button', {
    type: 'button', class: 'chip', 'data-screen-id': screen.id,
    'aria-pressed': String(screen.id === ui.screenId),
    'aria-keyshortcuts': index < SHORTCUT_SCREENS ? `Alt+${index + 1}` : undefined,
    onclick: () => { selectScreen(screen.id); noteBox.focus(); },
  }, index < SHORTCUT_SCREENS ? el('span', { class: 'chip-num', 'aria-hidden': 'true' }, `${index + 1}`) : null, screen.name));

  const selection = el('p', { id: 'current-selection', class: 'selection' });
  function showSelection() {
    selection.textContent = `${findScreen(study, ui.screenId)?.name ?? ''} · ${TYPE_LABELS[ui.type]}`;
  }

  function selectScreen(screenId) {
    ui.screenId = screenId;
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.screenId === screenId));
    showSelection();
    saveDraft();
  }

  // FR1: a name typed here picks that screen, or adds it to the study's list.
  const search = el('input', {
    id: 'screen-search', type: 'text', autocomplete: 'off', maxlength: 200, list: 'screen-options',
    'aria-keyshortcuts': 'Alt+S', 'aria-describedby': 'screen-search-help screen-error',
    onkeydown: (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        search.value = '';
        noteBox.focus();
      } else if (shortcutFor(event)?.action === 'save') {
        event.preventDefault();
        pickTypedScreen();
      }
    },
  });

  function pickTypedScreen() {
    if (search.value.trim() === '') { noteBox.focus(); return; }
    ctx.run(screenError, () => {
      const { study: next, screenId } = findOrAddScreen(study, search.value);
      const added = next !== study;
      if (added) repo.saveStudy(next);
      ui.screenId = screenId;
      saveDraft();
      const name = findScreen(next, screenId).name;
      render(container, ctx, { focus: '#note' });
      ctx.announce(added ? `Screen "${name}" added and selected.` : `Screen "${name}" selected.`);
    });
  }

  // ----- Pain / positive toggle (Alt+T) -----
  const typeButtons = Object.entries(TYPE_LABELS).map(([type, label]) => el('button', {
    type: 'button', class: `type-btn ${type}`, 'data-type': type, 'aria-pressed': String(type === ui.type),
    onclick: () => { setType(type); noteBox.focus(); },
  }, label));

  function setType(type) {
    ui.type = type;
    for (const button of typeButtons) button.setAttribute('aria-pressed', String(button.dataset.type === type));
    showSelection();
    saveDraft();
  }

  // ----- Save (Enter) -----
  function saveFinding() {
    ctx.run(noteError, () => {
      const { study: next } = addFinding(study, { screenId: ui.screenId, type: ui.type, note: noteBox.value });
      repo.saveStudy(next);
      noteBox.value = '';
      saveDraft();
      render(container, ctx, { focus: '#note' });
      ctx.announce('Finding saved.');
    });
  }

  // ----- Shortcuts anywhere on this screen -----
  onShortcut = (event) => {
    if (!noteBox.isConnected || container.closest('[hidden]') || document.querySelector('dialog[open]')) return;
    const shortcut = shortcutFor(event);
    if (!shortcut || shortcut.action === 'save') return; // Enter is handled by each box
    event.preventDefault();
    if (shortcut.action === 'screen') {
      const screen = study.screens[shortcut.index];
      if (screen) {
        selectScreen(screen.id);
        ctx.announce(`Screen: ${screen.name}`);
      } else {
        ctx.announce(`There is no screen ${shortcut.index + 1}.`);
      }
      noteBox.focus();
    } else if (shortcut.action === 'toggle-type') {
      setType(toggleFindingType(ui.type));
      ctx.announce(`Type: ${TYPE_LABELS[ui.type]}`);
      noteBox.focus();
    } else if (shortcut.action === 'search') {
      search.focus();
      search.select();
    }
  };

  showSelection();

  replaceChildren(container,
    bar,
    el('div', { class: 'live-pickers' },
      el('div', { role: 'group', 'aria-labelledby': 'screens-label' },
        el('p', { id: 'screens-label', class: 'picker-label' }, 'Screen ', el('span', { class: 'hint' }, '(Alt+1…9)')),
        el('div', { class: 'chips' }, chips)),
      el('div', { class: 'field' },
        el('label', { for: 'screen-search' }, 'Find or add a screen ', el('span', { class: 'hint' }, '(Alt+S)')),
        search,
        el('datalist', { id: 'screen-options' }, study.screens.map((s) => el('option', { value: s.name }))),
        el('p', { id: 'screen-search-help', class: 'hint' }, 'Type a name and press Enter. A new name is added to the screen list.'),
        screenError),
      el('div', { role: 'group', 'aria-labelledby': 'type-label' },
        el('p', { id: 'type-label', class: 'picker-label' }, 'Type ', el('span', { class: 'hint' }, '(Alt+T)')),
        el('div', { class: 'chips' }, typeButtons))),
    el('div', { class: 'note-area' },
      el('label', { for: 'note' }, 'Note'),
      selection,
      noteBox,
      el('p', { id: 'note-help', class: 'hint' }, 'Enter saves · Shift+Enter adds a new line'),
      el('p', { id: 'note-reminder', class: 'hint' }, 'Do not write names or personal details. Use the participant ID.'),
      noteError,
      el('button', { type: 'button', id: 'save-finding', class: 'primary', onclick: saveFinding }, 'Save finding')),
    renderFeed(container, ctx, study, noteBox));

  return noteBox;
}

// ---------- Recent findings, with a quick note fix (FR3) ----------

function renderFeed(container, ctx, study, noteBox) {
  const { repo } = ctx;
  const findings = recentFindings(study, RECENT_COUNT);
  const feedError = el('p', { id: 'feed-error', class: 'error', role: 'alert' });

  function stopEditing() {
    ui.editingId = null;
    render(container, ctx, { focus: '#note' });
  }

  const items = findings.map((finding) => {
    const screenName = findScreen(study, finding.screenId)?.name ?? '(removed screen)';
    const meta = el('p', { class: 'feed-meta' },
      el('span', { class: `type-tag ${finding.type}` }, TYPE_LABELS[finding.type]),
      ` ${participantOfFinding(study, finding) ?? ''} · ${screenName} · ${formatTime(finding.time)}`);

    if (finding.id === ui.editingId) {
      const editBox = el('textarea', {
        id: 'edit-note', rows: 2, value: finding.note, 'aria-label': 'Fix note', 'aria-describedby': 'feed-error',
        onkeydown: (event) => {
          if (event.key === 'Escape') { event.preventDefault(); stopEditing(); }
          else if (shortcutFor(event)?.action === 'save') { event.preventDefault(); saveEdit(); }
        },
      });
      function saveEdit() {
        ctx.run(feedError, () => {
          repo.saveStudy(editFinding(study, finding.id, { note: editBox.value }));
          ctx.announce('Note fixed.');
          stopEditing();
        });
      }
      return el('li', { 'data-finding-id': finding.id }, meta, editBox,
        el('div', { class: 'actions' },
          el('button', { type: 'button', onclick: saveEdit }, 'Save'),
          el('button', { type: 'button', onclick: stopEditing }, 'Cancel')));
    }

    return el('li', { 'data-finding-id': finding.id }, meta,
      el('p', { class: 'feed-note' }, finding.note),
      el('button', {
        type: 'button', class: 'edit',
        'aria-label': `Edit note: ${finding.note.slice(0, 40)}`,
        onclick: () => { ui.editingId = finding.id; render(container, ctx, { focus: '#edit-note' }); },
      }, 'Edit'));
  });

  return el('section', { class: 'feed', 'aria-labelledby': 'feed-heading' },
    el('h2', { id: 'feed-heading' }, 'Recent findings'),
    feedError,
    items.length === 0
      ? el('p', { class: 'empty' }, 'Nothing logged yet in this study.')
      : el('ol', { class: 'feed-list' }, items));
}

// 75 seconds → "01:15"; over an hour → "1:02:03".
function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
