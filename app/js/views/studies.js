// Studies screen: list of studies, create a study, copy a study for the next
// round, delete a study (with confirmation and a backup offer, D23).

import { el, replaceChildren } from './dom.js';
import { downloadText } from './download.js';
import {
  createStudy, copyStudyForNextRound, canDeleteStudy, markExported,
  PROTOTYPE_TYPES, PROTOTYPE_TYPE_LABELS,
} from '../model.js';
import { toExportText, exportFileName } from '../backup.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function render(container, ctx) {
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

    function exportBackup() {
      ctx.run(dialogError, () => {
        const exported = markExported(study);
        repo.saveStudy(exported);
        const fileName = exportFileName(exported);
        downloadText(fileName, toExportText(exported, exported.lastExportedAt));
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
      if (button.isConnected) button.focus();
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
        ['Study', 'Round', 'Prototype', 'Screens', 'Sessions', 'Findings', 'Actions']
          .map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, studies.map((study) => el('tr', { 'data-study-id': study.id },
        el('th', { scope: 'row' }, study.name,
          study.id === currentId ? el('span', { class: 'badge' }, ' (open)') : null),
        el('td', {}, String(study.round)),
        el('td', {}, PROTOTYPE_TYPE_LABELS[study.prototypeType] ?? study.prototypeType),
        el('td', {}, String(study.screens.length)),
        el('td', {}, String(study.sessions.length)),
        el('td', {}, String(study.findings.length)),
        el('td', { class: 'actions' },
          el('button', { type: 'button', onclick: () => open(study), 'aria-label': `Open ${study.name}, round ${study.round}` }, 'Open'),
          el('button', {
            type: 'button', onclick: () => copyForNextRound(study),
            'aria-label': `Copy ${study.name}, round ${study.round}, for next round`,
          }, 'Copy for next round'),
          el('button', {
            type: 'button', class: 'danger-outline', onclick: (e) => askDelete(study, e.currentTarget),
            'aria-label': `Delete ${study.name}, round ${study.round}`,
          }, 'Delete'))))));

  replaceChildren(container,
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
    list);
}
