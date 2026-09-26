// Saves a backup file of a study and records when that happened (FR7).
// Used by the Export study button and the delete dialog on the Studies list
// (D23, D28) and after "End session" (D17).

import { downloadText } from './download.js';
import { markExported } from '../model.js';
import { toExportText, exportFileName } from '../backup.js';

// Exports the study as it is saved now. Returns the file name, for a
// "Backup saved as …" message.
export function exportStudy(repo, studyId) {
  const exported = markExported(repo.loadStudy(studyId));
  repo.saveStudy(exported);
  const fileName = exportFileName(exported);
  downloadText(fileName, toExportText(exported, exported.lastExportedAt));
  return fileName;
}
