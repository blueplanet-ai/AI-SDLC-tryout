// Studies screen: list of studies, create a study, copy a study for the next round.

import { el, replaceChildren } from './dom.js';
import {
  createStudy, copyStudyForNextRound, PROTOTYPE_TYPES, PROTOTYPE_TYPE_LABELS,
} from '../model.js';

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
          }, 'Copy for next round'))))));

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
