import { test, assertEqual } from './runner.js';
import { toExportText, exportFileName } from '../../app/js/backup.js';
import { createStudy, addScreen } from '../../app/js/model.js';

function sample(name = 'SAMPLE checkout test') {
  let n = 0;
  const env = { newId: () => `id-${++n}`, now: () => '2026-09-24T10:00:00.000Z' };
  return addScreen(createStudy({ name, prototypeType: 'figma' }, env), 'Home', env);
}

test('FR7: the backup file carries schemaVersion and the whole study (D23)', () => {
  const study = sample();
  const parsed = JSON.parse(toExportText(study, '2026-09-24T12:00:00.000Z'));
  assertEqual(parsed, { schemaVersion: 1, exportedAt: '2026-09-24T12:00:00.000Z', study });
});

test('FR7: the backup file name ends in .study.json so git ignores it (D23)', () => {
  assertEqual(exportFileName(sample()), 'SAMPLE-checkout-test-round-1.study.json');
});

test('FR7: the backup file name keeps letters of any language and drops symbols (D23)', () => {
  assertEqual(exportFileName(sample(' 한국어 / test: "v2" ')), '한국어-test-v2-round-1.study.json');
  assertEqual(exportFileName(sample('***')), 'study-round-1.study.json');
});
