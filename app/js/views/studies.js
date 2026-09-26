// Studies screen: list of studies, create a study, copy a study for the next
// round, export a study, import a backup (FR7, D7, D28), delete a study (with
// confirmation and a backup offer, D23). Each row shows the round's feedback
// count against the target (FR8, D27) and when it was last exported (D28).

import { el, replaceChildren } from './dom.js';
import { exportStudy } from './export.js';
import { backupStatusText } from './backup-status.js';
import { askToKeepData } from '../persist.js';
import { parseExportText, importAsCopy, canImport, MAX_IMPORT_BYTES } from '../backup.js';
import {
  createStudy, copyStudyForNextRound, canDeleteStudy, findActiveSession, feedbackStatus,
  ModelError, PROTOTYPE_TYPES, PROTOTYPE_TYPE_LABELS,
} from '../model.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const KEEP_DATA_TEXT = {
  kept: 'This browser has agreed to keep this app\'s data. Still export a backup after each session.',
  'not-kept': 'This browser may delete this app\'s data on its own (Safari: after 7 days without a visit). '
    + 'Export a backup after each session.',
  unsupported: 'Browser data can be lost. Export a backup after each session.',
};

export function render(container, ctx, { focus } = {}) {
  const { repo } = ctx;
  const { studies, damaged } = repo.listStudies();

  const nameInput = el('input', {
    id: 'new-study-name', type: 'text', autocomplete: 'off', maxlength: 200,
    'aria-describedby': 'new-study-error',
  });
  const typeSelect = el('select', { id: 'new-study-type', 'aria-describedby': 'new-study-error' },
    el('option', { value: '' }, 'Choose…'),
    PROTOTYPE_TYPES.map((t) => el('option', { value: t }, PROTOTYPE_TYPE_LABELS[t])));
  const createError = el('p', { id: 'new-study-error', class: 'error', role: 'alert' });

  function onCreate(event) {
    event.preventDefault();
    createError.textContent = '';
    ctx.run(createError, () => {
      const study = createStudy({ name: nameInput.value, prototypeType: typeSelect.value });
      repo.saveStudy(study);
      repo.setCurrentStudyId(study.id);
      // C3(d): now there is data worth keeping, ask the browser to keep it.
      askToKeepData();
      ctx.announce(`Study "${study.name}" created.`);
      ctx.go('setup');
    });
  }

  function open(study) {
    ctx.run(listError, () => {
      repo.setCurrentStudyId(study.id);
      ctx.go('setup');
    });
  }

  function copyForNextRound(study) {
    ctx.run(listError, () => {
      const next = copyStudyForNextRound(study);
      repo.saveStudy(next);
      repo.setCurrentStudyId(next.id);
      ctx.announce(`Round ${next.round} of "${next.name}" created with ${next.screens.length} screens.`);
      ctx.go('setup');
    });
  }

  // D23: confirm in a dialog that also offers a backup; blocked while a session runs.
  function askDelete(study, button) {
    listError.textContent = '';
    const allowed = canDeleteStudy(study);
    if (!allowed.ok) {
      listError.textContent = allowed.message;
      return;
    }
    const backupStatus = el('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
    const dialogError = el('p', { class: 'error', role: 'alert' });
    let exported = false;

    function exportBackup() {
      ctx.run(dialogError, () => {
        const fileName = exportStudy(repo, study.id);
        exported = true;
        backupStatus.textContent = `Backup saved as ${fileName} in your Downloads folder.`;
      });
    }

    function confirmDelete() {
      ctx.run(dialogError, () => {
        repo.deleteStudy(study.id);
        dialog.close();
        ctx.announce(`Study "${study.name}" (round ${study.round}) deleted.`);
        render(container, ctx);
        container.querySelector('#new-study-name')?.focus();
      });
    }

    const cancel = el('button', { type: 'button', autofocus: true, onclick: () => dialog.close() }, 'Cancel');
    const dialog = el('dialog', { class: 'confirm', 'aria-labelledby': 'delete-title', 'aria-describedby': 'delete-desc' },
      el('h2', { id: 'delete-title' }, `Delete "${study.name}" (round ${study.round})?`),
      el('p', { id: 'delete-desc' },
        `This deletes the study with its ${plural(study.screens.length, 'screen')}, `
        + `${plural(study.sessions.length, 'session')}, ${plural(study.findings.length, 'finding')} `
        + `and ${plural(study.feedback.length, 'feedback response')}. `,
        el('strong', {}, 'Deleted data cannot be recovered.')),
      el('div', { class: 'actions' },
        el('button', { type: 'button', onclick: exportBackup }, 'Export a backup first'),
        el('button', { type: 'button', class: 'danger', onclick: confirmDelete }, 'Delete study'),
        cancel),
      backupStatus,
      dialogError);
    // After closing, remove the dialog and put focus back where it was.
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (!button.isConnected) return; // deleted: the list is already redrawn
      // A backup made in the dialog changed "Last exported" on this row.
      if (exported) render(container, ctx, { focus: `[data-study-id="${study.id}"] .delete` });
      else button.focus();
    });
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  }

  // FR7 / D28: save a backup file; the row then shows "Last exported: just now".
  function exportRow(study) {
    ctx.run(listError, () => {
      const fileName = exportStudy(repo, study.id);
      render(container, ctx, { focus: `[data-study-id="${study.id}"] .export` });
      ctx.announce(`Backup saved as ${fileName} in your Downloads folder.`);
    });
  }

  // ----- Import (FR7, D7) -----
  const importError = el('p', { id: 'import-error', class: 'error', role: 'alert' });
  const fileInput = el('input', {
    type: 'file', id: 'import-file', accept: '.json,application/json',
    'aria-describedby': 'import-help import-error',
    onchange: () => onImportFile(),
  });

  async function onImportFile() {
    importError.textContent = '';
    const file = fileInput.files?.[0];
    if (!file) return;
    let text;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new ModelError('Could not import this file: it is too large to be a study backup.');
      text = await file.text();
    } catch (err) {
      importError.textContent = err instanceof ModelError ? err.message : 'Could not read this file.';
      return;
    }
    ctx.run(importError, () => {
      const imported = parseExportText(text);
      const existing = repo.listStudies().studies.find((s) => s.id === imported.id);
      if (existing) askReplaceOrKeep(imported, existing);
      else saveImported(imported, {});
    });
    fileInput.value = '';
  }

  // Saves the imported study, unless a running session would clash (D12, D28).
  // Throws a ModelError with the reason, shown by ctx.run.
  function saveImported(imported, { replacing = false }) {
    const allowed = canImport(imported, repo.listStudies().studies, { replacing });
    if (!allowed.ok) throw new ModelError(allowed.message, 'cannot-import');
    repo.restoreStudy(imported);
    askToKeepData();
    render(container, ctx, { focus: '#import-file' });
    ctx.announce(replacing
      ? `Study "${imported.name}" (round ${imported.round}) replaced with the backup.`
      : `Study "${imported.name}" (round ${imported.round}) imported.`);
  }

  // D7: the study is already in this browser — replace it, or keep both.
  function askReplaceOrKeep(imported, existing) {
    const dialogError = el('p', { class: 'error', role: 'alert' });
    const choose = (action) => ctx.run(dialogError, () => {
      action();
      dialog.close();
    });

    const cancel = el('button', { type: 'button', onclick: () => dialog.close() }, 'Cancel');
    const dialog = el('dialog', { class: 'confirm', 'aria-labelledby': 'import-title', 'aria-describedby': 'import-desc' },
      el('h2', { id: 'import-title' }, `"${existing.name}" (round ${existing.round}) is already here`),
      el('p', { id: 'import-desc' },
        `The study in this browser has ${plural(existing.findings.length, 'finding')} and `
        + `${plural(existing.feedback.length, 'feedback response')}; the backup has `
        + `${plural(imported.findings.length, 'finding')} and ${plural(imported.feedback.length, 'feedback response')}. `,
        el('strong', {}, 'Replacing overwrites the study in this browser with the backup. This cannot be undone.')),
      el('div', { class: 'actions' },
        el('button', {
          type: 'button', class: 'danger', onclick: () => choose(() => saveImported(imported, { replacing: true })),
        }, 'Replace existing'),
        el('button', {
          type: 'button', onclick: () => choose(() => saveImported(importAsCopy(imported), {})),
        }, 'Keep both (import as copy)'),
        cancel),
      dialogError);
    // Focus goes back to the file box (it cannot move there while the dialog is open).
    dialog.addEventListener('close', () => {
      dialog.remove();
      container.querySelector('#import-file')?.focus();
    });
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  }

  const listError = el('p', { class: 'error', role: 'alert' });
  const currentId = repo.currentStudyId();

  const list = studies.length === 0
    ? el('p', { class: 'empty' }, 'No studies yet. Create one above.')
    : el('table', { class: 'studies-table' },
      el('caption', { class: 'visually-hidden' }, 'Your studies'),
      el('thead', {}, el('tr', {},
        ['Study', 'Round', 'Prototype', 'Screens', 'Sessions', 'Findings', 'Feedback', 'Backup', 'Actions']
          .map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, studies.map((study) => el('tr', { 'data-study-id': study.id },
        el('th', { scope: 'row' }, study.name,
          study.id === currentId ? el('span', { class: 'badge' }, ' (open)') : null),
        el('td', {}, String(study.round)),
        el('td', {}, PROTOTYPE_TYPE_LABELS[study.prototypeType] ?? study.prototypeType),
        el('td', {}, String(study.screens.length)),
        el('td', {}, String(study.sessions.length)),
        el('td', {}, String(study.findings.length)),
        // FR8 / D27: each round's feedback count, so rounds can be compared.
        el('td', { class: 'feedback-cell' }, feedbackStatus(study).text),
        // FR7 / D28: amber when the study changed after its last export.
        el('td', { class: 'backup-cell' }, backupStatusText(study, 'span')),
        el('td', { class: 'actions' },
          el('button', { type: 'button', onclick: () => open(study), 'aria-label': `Open ${study.name}, round ${study.round}` }, 'Open'),
          el('button', {
            type: 'button', onclick: () => copyForNextRound(study),
            'aria-label': `Copy ${study.name}, round ${study.round}, for next round`,
          }, 'Copy for next round'),
          el('button', {
            type: 'button', class: 'export', onclick: () => exportRow(study),
            'aria-label': `Export ${study.name}, round ${study.round}`,
          }, 'Export study'),
          el('button', {
            type: 'button', class: 'delete danger-outline', onclick: (e) => askDelete(study, e.currentTarget),
            'aria-label': `Delete ${study.name}, round ${study.round}`,
          }, 'Delete'))))));

  // D12: a running session resumes after the browser is reopened.
  const running = findActiveSession(studies);
  // C3(d): says whether the browser agreed to keep the data (filled in below).
  const keepDataLine = el('p', { id: 'keep-data', class: 'hint' });

  replaceChildren(container,
    running
      ? el('p', { id: 'running-session', class: 'warning' },
        `Session ${running.session.participantId} is running in "${running.study.name}" (round ${running.study.round}). `,
        el('a', { href: '#/live' }, 'Continue in Live log'))
      : null,
    el('h2', {}, 'Create a study'),
    el('form', { class: 'stack', onsubmit: onCreate, novalidate: true },
      el('div', { class: 'field' }, el('label', { for: 'new-study-name' }, 'Study name'), nameInput),
      el('div', { class: 'field' }, el('label', { for: 'new-study-type' }, 'Prototype type'), typeSelect),
      el('div', {}, el('button', { type: 'submit', class: 'primary' }, 'Create study')),
      createError),
    el('h2', {}, 'Your studies'),
    damaged.length > 0
      ? el('p', { class: 'warning', role: 'alert' },
        `${damaged.length} saved ${damaged.length === 1 ? 'study' : 'studies'} could not be read and ${damaged.length === 1 ? 'is' : 'are'} not shown. Nothing was deleted.`)
      : null,
    listError,
    list,
    keepDataLine,
    el('h2', {}, 'Import a study'),
    el('div', { class: 'field' },
      el('label', { for: 'import-file' }, 'Backup file (.study.json)'),
      el('p', { id: 'import-help', class: 'hint' },
        'Choose a file saved with "Export study", for example from another laptop.'),
      fileInput),
    importError);

  if (studies.length > 0) {
    askToKeepData().then((result) => { keepDataLine.textContent = KEEP_DATA_TEXT[result]; });
  }
  if (focus) container.querySelector(focus)?.focus();
}
