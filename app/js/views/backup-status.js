// The "Last exported" indicator (FR7, D28), shown on each Studies row and at
// the top of Setup, Live log, Review and Summary. Amber when the study changed
// after its last export; the words say so too, so colour is not the only sign.
// On the study screens it comes with a small "Export now" button (D28).

import { el } from './dom.js';
import { exportStudy } from './export.js';
import { backupStatus } from '../model.js';

export function backupStatusText(study, tag = 'p', attrs = {}) {
  const status = backupStatus(study);
  return el(tag, { ...attrs, class: `backup-status${status.warn ? ' warn' : ''}` }, status.text);
}

// The indicator line alone.
export function backupStatusLine(study) {
  return backupStatusText(study, 'p', { id: 'backup-status' });
}

// For a part of a screen that redraws only itself (the Feedback received
// panel), and after "Export now": the rest of the screen is left as it is.
export function refreshBackupStatusLine(study) {
  document.getElementById('backup-status')?.replaceWith(backupStatusLine(study));
}

// The indicator plus "Export now", for the top of a study's screens.
// `keepFocusOn` (Live log): the box that keeps focus. A mouse click then never
// moves focus to the button, and after exporting focus goes back to that box.
export function backupHeader(study, ctx, { keepFocusOn } = {}) {
  const error = el('p', { id: 'export-now-error', class: 'error', role: 'alert' });
  const button = el('button', {
    type: 'button', id: 'export-now', class: 'small', 'aria-describedby': 'backup-status',
    onmousedown: keepFocusOn ? (event) => event.preventDefault() : undefined,
    onclick: () => {
      ctx.run(error, () => {
        const fileName = exportStudy(ctx.repo, study.id);
        refreshBackupStatusLine(ctx.repo.loadStudy(study.id));
        ctx.announce(`Backup saved as ${fileName} in your Downloads folder.`);
      });
      keepFocusOn?.focus();
    },
  }, 'Export now');
  return el('div', { class: 'backup-header' }, backupStatusLine(study), button, error);
}
