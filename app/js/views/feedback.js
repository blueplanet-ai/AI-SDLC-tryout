// Feedback received panel (FR8), shown on the Summary screen: log each reply
// readers send about the summary, see the round's count against the target of
// 2, and delete a response (with confirmation, D16). Feedback cannot be edited
// (D27): delete it and add it again. Only the date and the text are stored.

import { el, replaceChildren } from './dom.js';
import {
  addFeedback, deleteFeedback, feedbackNewestFirst, feedbackStatus, localDate,
} from '../model.js';

// Draws the panel into `panel` for the study with `studyId`. Redraws only
// itself, so the rest of the Summary screen (such as the name check) is kept.
export function renderFeedbackPanel(panel, ctx, studyId, { focus } = {}) {
  const { repo } = ctx;
  let study;
  try {
    study = repo.loadStudy(studyId);
  } catch (err) {
    ctx.showStoreError(err);
    return;
  }
  if (!study) return;

  const redraw = (focusAfter) => renderFeedbackPanel(panel, ctx, studyId, { focus: focusAfter });
  const status = feedbackStatus(study);
  const today = localDate(new Date());

  // ----- Add feedback -----
  const formError = el('p', { id: 'feedback-error', class: 'error', role: 'alert' });
  const dateInput = el('input', {
    type: 'date', id: 'feedback-date', value: today, max: today, required: true,
    'aria-describedby': 'feedback-error',
  });
  const textBox = el('textarea', {
    id: 'feedback-text', rows: 4, required: true,
    'aria-describedby': 'feedback-reminder feedback-error',
  });

  function onAdd(event) {
    event.preventDefault();
    ctx.run(formError, () => {
      repo.saveStudy(addFeedback(study, { receivedOn: dateInput.value, text: textBox.value }));
      redraw('#feedback-text');
      ctx.announce(`Feedback added. ${feedbackStatus(repo.loadStudy(studyId)).text}.`);
    });
  }

  const form = el('form', { class: 'stack feedback-form', onsubmit: onAdd, novalidate: true },
    el('div', { class: 'field' }, el('label', { for: 'feedback-date' }, 'Date received'), dateInput),
    el('div', { class: 'field' },
      el('label', { for: 'feedback-text' }, 'Feedback'),
      el('p', { id: 'feedback-reminder', class: 'hint' },
        'Paste the content only — no names, email addresses or signatures.'),
      textBox),
    el('div', {}, el('button', { type: 'submit', class: 'primary' }, 'Add feedback')),
    formError);

  // ----- Logged feedback -----
  // D16: permanent, so confirm first. Cancel is focused, so Enter never deletes by accident.
  function askDelete(item, opener) {
    const dialogError = el('p', { class: 'error', role: 'alert' });
    let deleted = false;

    function confirmDelete() {
      ctx.run(dialogError, () => {
        repo.saveStudy(deleteFeedback(repo.loadStudy(studyId), item.id));
        deleted = true;
        dialog.close();
        redraw('#feedback-status');
        ctx.announce(`Feedback deleted. ${feedbackStatus(repo.loadStudy(studyId)).text}.`);
      });
    }

    const cancel = el('button', { type: 'button', onclick: () => dialog.close() }, 'Cancel');
    const dialog = el('dialog', { class: 'confirm', 'aria-labelledby': 'delete-feedback-title', 'aria-describedby': 'delete-feedback-desc' },
      el('h2', { id: 'delete-feedback-title' }, 'Delete this feedback?'),
      el('div', { id: 'delete-feedback-desc' },
        el('p', { class: 'feed-meta' }, `Received ${item.receivedOn}`),
        el('p', { class: 'feed-note' }, item.text),
        el('p', {}, el('strong', {}, 'Deleted feedback cannot be recovered.'))),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'danger', onclick: confirmDelete }, 'Delete feedback'),
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

  const items = feedbackNewestFirst(study);
  const list = items.length === 0
    ? el('p', { class: 'empty' }, 'No feedback logged yet for this round.')
    : el('ul', { id: 'feedback-list', class: 'feed-list', 'aria-label': 'Logged feedback' },
      items.map((item) => el('li', { 'data-feedback-id': item.id },
        el('p', { class: 'feed-meta' }, `Received ${item.receivedOn}`),
        el('p', { class: 'feed-note' }, item.text),
        el('div', { class: 'actions' },
          el('button', {
            type: 'button', class: 'danger-outline',
            'aria-label': `Delete feedback received ${item.receivedOn}: ${item.text.slice(0, 40)}`,
            onclick: (event) => askDelete(item, event.currentTarget),
          }, 'Delete')))));

  replaceChildren(panel,
    el('h2', { id: 'feedback-title' }, 'Feedback received'),
    el('p', {
      id: 'feedback-status', tabindex: -1,
      class: `feedback-status ${status.met ? 'met' : 'below'}`,
    }, status.text),
    el('p', { class: 'hint' },
      'Log each reply to the summary here. The target is 2 responses per round. ',
      'Logged feedback cannot be edited: delete it and add it again.'),
    form,
    list);

  if (focus) panel.querySelector(focus)?.focus();
}
