// The "Last exported" indicator (FR7, D28), shown on each Studies row and at
// the top of Setup, Live log, Review and Summary. Amber when the study changed
// after its last export; the words say so too, so colour is not the only sign.

import { el } from './dom.js';
import { backupStatus } from '../model.js';

export function backupStatusText(study, tag = 'p', attrs = {}) {
  const status = backupStatus(study);
  return el(tag, { ...attrs, class: `backup-status${status.warn ? ' warn' : ''}` }, status.text);
}

// The line at the top of a study's screens.
export function backupStatusLine(study) {
  return backupStatusText(study, 'p', { id: 'backup-status' });
}

// For a part of a screen that redraws only itself (the Feedback received panel).
export function refreshBackupStatusLine(study) {
  document.getElementById('backup-status')?.replaceWith(backupStatusLine(study));
}
