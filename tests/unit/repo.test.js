import { test, assertEqual, assertThrows } from './runner.js';
import { createStore, createMemoryBackend } from '../../app/js/store.js';
import { createRepo } from '../../app/js/repo.js';
import { createStudy, addScreen } from '../../app/js/model.js';

function setup() {
  const backend = createMemoryBackend();
  return { backend, repo: createRepo(createStore(backend)) };
}

function study(id, createdAt, name = 'SAMPLE') {
  let n = 0;
  return createStudy({ name, prototypeType: 'figma' }, { newId: () => (n++ === 0 ? id : `${id}-x${n}`), now: () => createdAt });
}

test('FR7: a saved study is loaded back unchanged', () => {
  const { repo } = setup();
  const s = addScreen(study('a', '2026-09-24T10:00:00.000Z'), 'Home', { newId: () => 'scr', now: () => '' });
  repo.saveStudy(s);
  assertEqual(repo.loadStudy('a'), s);
});

test('FR7: each study is stored under its own tsn:study: key', () => {
  const { repo, backend } = setup();
  repo.saveStudy(study('a', '2026-09-24T10:00:00.000Z'));
  assertEqual(backend.getItem('tsn:study:a') !== null, true);
});

test('FR1: studies are listed newest first', () => {
  const { repo } = setup();
  repo.saveStudy(study('old', '2026-09-01T10:00:00.000Z', 'SAMPLE old'));
  repo.saveStudy(study('new', '2026-09-24T10:00:00.000Z', 'SAMPLE new'));
  assertEqual(repo.listStudies().studies.map((s) => s.name), ['SAMPLE new', 'SAMPLE old']);
});

test('FR7: a damaged study is reported and the others still load', () => {
  const { repo, backend } = setup();
  repo.saveStudy(study('good', '2026-09-24T10:00:00.000Z'));
  backend.setItem('tsn:study:bad', '{broken');
  const { studies, damaged } = repo.listStudies();
  assertEqual(studies.map((s) => s.id), ['good']);
  assertEqual(damaged, ['study:bad']);
  assertEqual(backend.getItem('tsn:study:bad'), '{broken', 'damaged data left untouched:');
});

test('FR7: other keys are not listed as studies', () => {
  const { repo, backend } = setup();
  repo.setCurrentStudyId('a');
  backend.setItem('someone-else', 'x');
  assertEqual(repo.listStudies(), { studies: [], damaged: [] });
});

test('FR7: the open study is remembered', () => {
  const { repo } = setup();
  const s = study('a', '2026-09-24T10:00:00.000Z');
  repo.saveStudy(s);
  assertEqual(repo.currentStudy(), null);
  repo.setCurrentStudyId('a');
  assertEqual(repo.currentStudyId(), 'a');
  assertEqual(repo.currentStudy().id, 'a');
  repo.setCurrentStudyId(null);
  assertEqual(repo.currentStudyId(), null);
});

test('FR7: an open study that no longer exists counts as none', () => {
  const { repo } = setup();
  repo.setCurrentStudyId('gone');
  assertEqual(repo.currentStudy(), null);
});

test('FR7: a damaged open study is reported, not hidden', () => {
  const { repo, backend } = setup();
  backend.setItem('tsn:study:a', '{broken');
  repo.setCurrentStudyId('a');
  assertThrows(() => repo.currentStudy(), 'StoreError');
});

test('FR1: deleting a study removes it and closes it if it was open (D23)', () => {
  const { repo, backend } = setup();
  repo.saveStudy(study('a', '2026-09-24T10:00:00.000Z'));
  repo.saveStudy(study('b', '2026-09-24T11:00:00.000Z'));
  repo.setCurrentStudyId('a');
  repo.deleteStudy('a');
  assertEqual(backend.getItem('tsn:study:a'), null);
  assertEqual(repo.currentStudyId(), null);
  assertEqual(repo.listStudies().studies.map((s) => s.id), ['b']);
});

test('FR1: deleting another study keeps the open one open (D23)', () => {
  const { repo } = setup();
  repo.saveStudy(study('a', '2026-09-24T10:00:00.000Z'));
  repo.saveStudy(study('b', '2026-09-24T11:00:00.000Z'));
  repo.setCurrentStudyId('a');
  repo.deleteStudy('b');
  assertEqual(repo.currentStudyId(), 'a');
});
