// Turns a study into a backup file and back. No screen code here.
// Step 4 (D23) needs only the export half; import and its checks come in step 9.

import { SCHEMA_VERSION } from './store.js';

export const EXPORT_EXTENSION = '.study.json';

// The file text: readable JSON with the format version, so later versions can read it.
export function toExportText(study, exportedAt) {
  return `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt, study }, null, 2)}\n`;
}

// e.g. "SAMPLE checkout test", round 2 → "SAMPLE-checkout-test-round-2.study.json".
// The ".study.json" ending keeps exports out of git (see .gitignore).
export function exportFileName(study) {
  const base = study.name
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'study';
  return `${base}-round-${study.round}${EXPORT_EXTENSION}`;
}
