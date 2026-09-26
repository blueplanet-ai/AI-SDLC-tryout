import { test, assertEqual, assertThrows } from './runner.js';
import {
  toExportText, exportFileName, parseExportText, importAsCopy, canImport,
} from '../../app/js/backup.js';
import { createStudy, addScreen, startSession, addFinding, addFeedback, endSession } from '../../app/js/model.js';

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

// ---------- Import ----------

// A study with a screen, an ended session, a finding and feedback.
function fullStudy() {
  let n = 100;
  let minute = 0;
  const env = { newId: () => `id-${++n}`, now: () => new Date(Date.UTC(2026, 8, 24, 10, minute++)).toISOString() };
  let study = sample();
  const started = startSession(study, 'P1', env);
  study = addFinding(started.study, { screenId: study.screens[0].id, type: 'pain', note: 'SAMPLE line 1\nline 2' }, env).study;
  study = endSession(study, started.sessionId, env);
  return addFeedback(study, { receivedOn: '2026-09-23', text: 'SAMPLE useful' }, env);
}

const fileWith = (change) => {
  const file = JSON.parse(toExportText(fullStudy(), '2026-09-24T12:00:00.000Z'));
  change(file);
  return JSON.stringify(file);
};

function assertRefused(text, expected) {
  const err = assertThrows(() => parseExportText(text), 'ModelError');
  if (!err.message.startsWith('Could not import this file: ')) throw new Error(`unexpected message: ${err.message}`);
  if (expected && !err.message.includes(expected)) throw new Error(`expected "${expected}" in: ${err.message}`);
}

test('FR7: an exported study is imported back exactly', () => {
  const study = fullStudy();
  assertEqual(parseExportText(toExportText(study, '2026-09-24T12:00:00.000Z')), study);
});

test('FR7: the SAMPLE fixture file can be imported', async () => {
  const text = await (await fetch('../fixtures/sample-study.study.json')).text();
  const study = parseExportText(text);
  assertEqual([study.name.startsWith('SAMPLE'), study.findings.length, study.feedback.length], [true, 4, 1]);
});

test('FR7: import refuses a file that is not a study backup', () => {
  assertRefused('not json at all', 'not a study backup');
  assertRefused('{"hello": 1}', 'not a study backup');
  assertRefused('[]', 'not a study backup');
  assertRefused(fileWith((f) => { f.schemaVersion = '1'; }), 'not a study backup');
});

test('FR7: import refuses a backup from a newer version of the app', () => {
  assertRefused(fileWith((f) => { f.schemaVersion = 2; }), 'newer version');
});

test('FR7: import refuses unknown fields, so no names or contact details can get in', () => {
  assertRefused(fileWith((f) => { f.study.email = 'anna@example.com'; }), 'unknown field "email"');
  assertRefused(fileWith((f) => { f.study.sessions[0].name = 'Anna'; }), 'unknown field "name"');
  assertRefused(fileWith((f) => { f.study.feedback[0].from = 'Anna'; }), 'unknown field "from"');
  assertRefused(fileWith((f) => { f.photo = 'x'; }), 'unknown field "photo"');
});

test('FR7: import refuses participants that are not P<number> (FR2)', () => {
  for (const bad of ['Anna', 'P0', 'P03', 'p1', '', 7]) {
    assertRefused(fileWith((f) => { f.study.sessions[0].participantId = bad; }), 'participant');
  }
});

test('FR7: import refuses damaged or inconsistent data', () => {
  assertRefused(fileWith((f) => { delete f.study.findings; }), 'no "findings"');
  assertRefused(fileWith((f) => { f.study.name = '  '; }), 'study name');
  assertRefused(fileWith((f) => { f.study.prototypeType = 'paper'; }), 'prototype type');
  assertRefused(fileWith((f) => { f.study.round = 0; }), 'round');
  assertRefused(fileWith((f) => { f.study.createdAt = 'yesterday'; }), 'valid time');
  assertRefused(fileWith((f) => { f.study.findings[0].screenId = 'nope'; }), 'screen that is not in the file');
  assertRefused(fileWith((f) => { f.study.findings[0].sessionId = 'nope'; }), 'session that is not in the file');
  assertRefused(fileWith((f) => { f.study.findings[0].type = 'meh'; }), 'unknown type');
  assertRefused(fileWith((f) => { f.study.findings[0].note = ''; }), 'note');
  assertRefused(fileWith((f) => { f.study.feedback[0].receivedOn = '24/09/2026'; }), 'date');
  assertRefused(fileWith((f) => { f.study.screens.push({ id: 'x', name: 'home' }); }), 'two screens');
  assertRefused(fileWith((f) => { f.study.screens.push({ ...f.study.screens[0], name: 'Other' }); }), 'same id');
  assertRefused(fileWith((f) => {
    f.study.sessions.push({ id: 's2', participantId: 'P2', startedAt: f.study.createdAt, endedAt: null });
    f.study.sessions.push({ id: 's3', participantId: 'P3', startedAt: f.study.createdAt, endedAt: null });
  }), 'more than one running session');
});

test('FR7: a backup made before D28 counts as unchanged since its export', () => {
  const text = fileWith((f) => {
    delete f.study.changedAt;
    f.study.lastExportedAt = '2026-09-24T12:00:00.000Z';
  });
  assertEqual(parseExportText(text).changedAt, '2026-09-24T12:00:00.000Z');
});

test('FR7: "Keep both" imports a copy with a new id and "(copy)" after the name (D7)', () => {
  const study = fullStudy();
  const copy = importAsCopy(study, { newId: () => 'new-id', now: () => '' });
  assertEqual([copy.id, copy.name], ['new-id', 'SAMPLE checkout test (copy)']);
  assertEqual({ ...copy, id: study.id, name: study.name }, study);
  assertEqual(importAsCopy({ ...study, name: 'x'.repeat(200) }).name.length, 200);
});

function running(study, id = 'run') {
  return { ...study, sessions: [...study.sessions, { id, participantId: 'P9', startedAt: study.createdAt, endedAt: null }] };
}

test('FR7: "Replace existing" is blocked while that study has a running session (D28)', () => {
  const study = fullStudy();
  assertEqual(canImport(study, [study], { replacing: true }), { ok: true });
  assertEqual(canImport(study, [running(study)], { replacing: true }),
    { ok: false, message: 'End the running session before replacing this study.' });
});

test('FR7: a backup with a running session is refused while another session runs (D12)', () => {
  const other = running({ ...fullStudy(), id: 'other', name: 'SAMPLE other' });
  const result = canImport(running(fullStudy()), [other]);
  assertEqual(result.ok, false);
  assertEqual(result.message.includes('"SAMPLE other" (round 1)'), true);
  assertEqual(canImport(fullStudy(), [other]), { ok: true }, 'no running session in the backup:');
});
