// Saves a backup file of a study and records when that happened (FR7).
// Used by the delete dialog (D23) and after "End session" (D17).

import { downloadText } from './download.js';
import { markExported } from '../model.js';
import { toExportText, exportFileName } from '../backup.js';

// Returns the file name, for a "Backup saved as …" message.
export function exportStudy(repo, study) {
  const exported = markExported(study);
  repo.saveStudy(exported);
  const fileName = exportFileName(exported);
  downloadText(fileName, toExportText(exported, exported.lastExportedAt));
  return fileName;
}
