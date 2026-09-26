// Summary screen (FR5, FR6): shows the summary text of the open study, with
// Copy and Download. Both give exactly the text shown, from toMarkdown().
// C2 / D26: Copy and Download stay disabled until the note-taker ticks
// "I checked for names and personal details". The tick is not remembered,
// so every visit to this screen asks again.
// Below the summary sits the Feedback received panel (FR8, views/feedback.js).

import { el, replaceChildren } from './dom.js';
import { backupStatusLine } from './backup-status.js';
import { downloadText } from './download.js';
import { renderFeedbackPanel } from './feedback.js';
import { toMarkdown, summaryFileName } from '../summary.js';

export function render(container, ctx) {
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

  // The text is made once, so what is copied is exactly what was checked.
  const text = toMarkdown(study);
  const error = el('p', { id: 'summary-error', class: 'error', role: 'alert' });

  const copyButton = el('button', {
    type: 'button', id: 'copy-summary', class: 'primary', disabled: true,
    onclick: async () => {
      error.textContent = '';
      try {
        await navigator.clipboard.writeText(text);
        ctx.announce('Summary copied. Paste it into an email, chat or document.');
      } catch {
        error.textContent = 'Could not copy. Use "Download summary", or select the text below and copy it.';
      }
    },
  }, 'Copy summary');

  const downloadButton = el('button', {
    type: 'button', id: 'download-summary', disabled: true,
    onclick: () => {
      error.textContent = '';
      const fileName = summaryFileName(study);
      downloadText(fileName, text, 'text/markdown;charset=utf-8');
      ctx.announce(`Summary saved as "${fileName}".`);
    },
  }, 'Download summary');

  const checked = el('input', {
    type: 'checkbox', id: 'names-checked', 'aria-describedby': 'names-help',
    onchange: (event) => {
      copyButton.disabled = !event.currentTarget.checked;
      downloadButton.disabled = !event.currentTarget.checked;
    },
  });

  // FR8: logging feedback redraws only this panel, so the name-check tick is kept.
  const feedbackPanel = el('section', { class: 'feedback-panel', 'aria-labelledby': 'feedback-title' });

  replaceChildren(container,
    el('p', { class: 'context' }, `${study.name} · Round ${study.round}`),
    backupStatusLine(study),
    el('div', { class: 'name-check' },
      el('p', { id: 'names-help' },
        'Before sharing, read the summary below for names or personal details. ',
        'Fix any you find in ', el('a', { href: '#/review' }, 'Review'), '.'),
      el('p', { class: 'check' }, checked,
        el('label', { for: 'names-checked' }, 'I checked for names and personal details'))),
    el('div', { class: 'actions' }, copyButton, downloadButton),
    error,
    el('h2', { id: 'summary-preview-title' }, 'Summary text'),
    // Shown as plain text, exactly as it will be copied; tabindex lets keyboard users scroll it.
    el('pre', {
      id: 'summary-text', class: 'summary-text', tabindex: 0, 'aria-labelledby': 'summary-preview-title',
    }, text),
    feedbackPanel);
  renderFeedbackPanel(feedbackPanel, ctx, study.id);
}
