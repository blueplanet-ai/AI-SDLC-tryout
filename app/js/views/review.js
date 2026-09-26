// Review screen (FR4): all findings of the open study in a table, with
// filters by participant, screen and type, and edit/delete for each finding.
// Works during and after a session. Newest first, like the Live log feed (D25).
// The rules come from model.js.

import { el, replaceChildren } from './dom.js';
import { backupStatusLine } from './backup-status.js';
import { shortcutFor } from '../keyboard.js';
import {
  filterFindings, editFinding, deleteFinding, participantOfFinding, participantIds,
  findScreen, FINDING_TYPES,
} from '../model.js';

const TYPE_LABELS = { pain: 'Pain point', positive: 'Positive moment' };
const NO_FILTERS = { participantId: '', screenId: '', type: '' };

// What the note-taker chose; survives re-drawing the screen, not a reload.
// Reset when another study is opened, so old filters never hide findings by surprise.
let ui = { studyId: null, filters: { ...NO_FILTERS }, editingId: null };

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
  if (ui.studyId !== study.id) ui = { studyId: study.id, filters: { ...NO_FILTERS }, editingId: null };

  const tableError = el('p', { id: 'review-error', class: 'error', role: 'alert' });
  const redraw = (focusAfter) => render(container, ctx, { focus: focusAfter });

  // ----- Filters -----
  // A chosen participant or screen that no longer exists matches nothing, so drop it.
  const ids = participantIds(study);
  if (!ids.includes(ui.filters.participantId)) ui.filters.participantId = '';
  if (!findScreen(study, ui.filters.screenId)) ui.filters.screenId = '';

  function filterSelect(id, key, label, options) {
    return el('div', { class: 'field' },
      el('label', { for: id }, label),
      el('select', {
        id, 'aria-controls': 'findings-table',
        onchange: (event) => {
          ui.filters[key] = event.currentTarget.value;
          ui.editingId = null;
          redraw(`#${id}`);
        },
      },
      el('option', { value: '', selected: ui.filters[key] === '' }, 'All'),
      options.map(([value, text]) => el('option', { value, selected: ui.filters[key] === value }, text))));
  }

  const filtered = ui.filters.participantId || ui.filters.screenId || ui.filters.type;
  const filters = el('div', { class: 'filters', role: 'group', 'aria-label': 'Filter findings' },
    filterSelect('filter-participant', 'participantId', 'Participant', ids.map((p) => [p, p])),
    filterSelect('filter-screen', 'screenId', 'Screen', study.screens.map((s) => [s.id, s.name])),
    filterSelect('filter-type', 'type', 'Type', FINDING_TYPES.map((t) => [t, TYPE_LABELS[t]])),
    el('button', {
      type: 'button', id: 'clear-filters', disabled: !filtered,
      onclick: () => { ui.filters = { ...NO_FILTERS }; redraw('#filter-participant'); },
    }, 'Clear filters'));

  // ----- Table -----
  const shown = filterFindings(study, chosenFilters()).reverse();
  const total = study.findings.length;

  function saveEdit(finding, fields) {
    ctx.run(tableError, () => {
      const next = editFinding(study, finding.id, fields);
      repo.saveStudy(next);
      ui.editingId = null;
      const stillShown = filterFindings(next, chosenFilters()).some((f) => f.id === finding.id);
      redraw(stillShown ? `[data-finding-id="${finding.id}"] .edit` : '#findings-count');
      ctx.announce(stillShown ? 'Finding saved.' : 'Finding saved. It no longer matches the filters, so it is hidden.');
    });
  }

  function editRow(finding) {
    const cancel = () => { ui.editingId = null; redraw(`[data-finding-id="${finding.id}"] .edit`); };
    const onKeydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    };
    const screenSelect = el('select', { id: 'edit-screen', 'aria-label': 'Screen', onkeydown: onKeydown },
      study.screens.map((s) => el('option', { value: s.id, selected: s.id === finding.screenId }, s.name)));
    const typeSelect = el('select', { id: 'edit-type', 'aria-label': 'Type', onkeydown: onKeydown },
      FINDING_TYPES.map((t) => el('option', { value: t, selected: t === finding.type }, TYPE_LABELS[t])));
    const save = () => saveEdit(finding,
      { screenId: screenSelect.value, type: typeSelect.value, note: noteBox.value });
    const noteBox = el('textarea', {
      id: 'edit-note', rows: 3, value: finding.note, 'aria-label': 'Note',
      'aria-describedby': 'edit-help review-error',
      onkeydown: (event) => {
        onKeydown(event);
        if (shortcutFor(event)?.action === 'save') { event.preventDefault(); save(); }
      },
    });
    return el('tr', { 'data-finding-id': finding.id, class: 'editing' },
      el('td', {}, formatTime(finding.time)),
      el('td', {}, participantOfFinding(study, finding) ?? ''),
      el('td', {}, screenSelect),
      el('td', {}, typeSelect),
      el('td', {}, noteBox,
        el('p', { id: 'edit-help', class: 'hint' },
          'Enter saves · Shift+Enter adds a new line · Escape cancels. No names or personal details.')),
      el('td', {}, el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'save primary', onclick: save }, 'Save'),
        el('button', { type: 'button', class: 'cancel', onclick: cancel }, 'Cancel'))));
  }

  function row(finding) {
    if (finding.id === ui.editingId) return editRow(finding);
    const participant = participantOfFinding(study, finding) ?? '';
    const short = finding.note.slice(0, 40);
    return el('tr', { 'data-finding-id': finding.id },
      el('td', {}, formatTime(finding.time)),
      el('td', {}, participant),
      el('td', {}, findScreen(study, finding.screenId)?.name ?? '(removed screen)'),
      el('td', {}, el('span', { class: `type-tag ${finding.type}` }, TYPE_LABELS[finding.type])),
      el('td', { class: 'note-cell' }, finding.note),
      el('td', {}, el('div', { class: 'actions' },
        el('button', {
          type: 'button', class: 'edit', 'aria-label': `Edit finding: ${short}`,
          onclick: () => { ui.editingId = finding.id; redraw('#edit-note'); },
        }, 'Edit'),
        el('button', {
          type: 'button', class: 'delete danger-outline', 'aria-label': `Delete finding: ${short}`,
          onclick: (event) => askDelete(finding, participant, event.currentTarget),
        }, 'Delete'))));
  }

  // D16: permanent, so confirm first. Cancel is focused, so Enter never deletes by accident.
  function askDelete(finding, participant, opener) {
    const dialogError = el('p', { class: 'error', role: 'alert' });
    let deleted = false;

    function confirmDelete() {
      ctx.run(dialogError, () => {
        repo.saveStudy(deleteFinding(study, finding.id));
        deleted = true;
        if (ui.editingId === finding.id) ui.editingId = null;
        dialog.close();
        redraw('#findings-count');
        ctx.announce('Finding deleted.');
      });
    }

    const cancel = el('button', { type: 'button', onclick: () => dialog.close() }, 'Cancel');
    const dialog = el('dialog', { class: 'confirm', 'aria-labelledby': 'delete-finding-title', 'aria-describedby': 'delete-finding-desc' },
      el('h2', { id: 'delete-finding-title' }, 'Delete this finding?'),
      el('div', { id: 'delete-finding-desc' },
        el('p', { class: 'feed-meta' },
          `${TYPE_LABELS[finding.type]} · ${participant} · ${findScreen(study, finding.screenId)?.name ?? ''}`),
        el('p', { class: 'feed-note' }, finding.note),
        el('p', {}, el('strong', {}, 'A deleted finding cannot be recovered.'))),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'danger', onclick: confirmDelete }, 'Delete finding'),
        cancel),
      dialogError);
    // Cancel or Escape: remove the dialog and go back to the Delete button.
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (!deleted && opener.isConnected) opener.focus();
    });
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  }

  let body;
  if (total === 0) {
    body = el('p', { class: 'empty' }, 'No findings logged yet in this study. ',
      el('a', { href: '#/live' }, 'Go to Live log'), ' to log some.');
  } else if (shown.length === 0) {
    body = el('p', { class: 'empty' }, 'No findings match these filters.');
  } else {
    body = el('table', { id: 'findings-table', class: 'findings-table' },
      el('caption', { class: 'visually-hidden' }, 'Findings'),
      el('thead', {}, el('tr', {},
        ['Time', 'Participant', 'Screen', 'Type', 'Note', 'Actions'].map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, shown.map(row)));
  }

  replaceChildren(container,
    el('p', { class: 'context' }, `${study.name} · Round ${study.round}`),
    backupStatusLine(study),
    total === 0 ? null : filters,
    el('p', { id: 'findings-count', tabindex: -1 },
      filtered ? `Showing ${shown.length} of ${plural(total, 'finding')}.` : `${plural(total, 'finding')}.`),
    tableError,
    body);

  if (focus) container.querySelector(focus)?.focus();
}

// "All" is stored as '' and means "no filter" to the model.
function chosenFilters() {
  const { participantId, screenId, type } = ui.filters;
  return { participantId: participantId || undefined, screenId: screenId || undefined, type: type || undefined };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Findings come from several days, so show the date as well as the time.
function formatTime(iso) {
  return new Date(iso).toLocaleString([], {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
