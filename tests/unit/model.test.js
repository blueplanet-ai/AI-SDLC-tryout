import { test, assertEqual, assertThrows } from './runner.js';
import * as m from '../../app/js/model.js';

// Fixed ids and clock so results are the same on every run.
function testEnv() {
  let id = 0;
  let minute = 0;
  return {
    newId: () => `id-${++id}`,
    now: () => new Date(Date.UTC(2026, 8, 24, 10, minute++)).toISOString(),
  };
}

function sampleStudy(env, screens = ['Home', 'Menu', 'Settings']) {
  let study = m.createStudy({ name: 'SAMPLE study', prototypeType: 'figma' }, env);
  for (const name of screens) study = m.addScreen(study, name, env);
  return study;
}

function withSession(env, participant = 'P1') {
  return m.startSession(sampleStudy(env), participant, env).study;
}

function assertModelError(fn, code) {
  const err = assertThrows(fn, 'ModelError');
  if (code) assertEqual(err.code, code, 'error code:');
  return err;
}

// ---------- FR1: study setup ----------

test('FR1: creates a study with name, prototype type and empty lists', () => {
  const study = m.createStudy({ name: '  SAMPLE study ', prototypeType: 'in-vehicle' }, testEnv());
  assertEqual(study.name, 'SAMPLE study');
  assertEqual(study.prototypeType, 'in-vehicle');
  assertEqual(study.round, 1);
  assertEqual([study.screens, study.sessions, study.findings, study.feedback], [[], [], [], []]);
  assertEqual(study.lastExportedAt, null);
});

test('FR1: accepts the three prototype types', () => {
  for (const type of ['figma', 'in-vehicle', 'other']) {
    assertEqual(m.createStudy({ name: 'SAMPLE', prototypeType: type }, testEnv()).prototypeType, type);
  }
});

test('FR1: rejects an empty study name', () => {
  assertModelError(() => m.createStudy({ name: '   ', prototypeType: 'figma' }, testEnv()), 'empty-name');
});

test('FR1: rejects an unknown prototype type', () => {
  assertModelError(() => m.createStudy({ name: 'SAMPLE', prototypeType: 'paper' }, testEnv()), 'bad-prototype-type');
});

test('FR1: study name and prototype type can be changed', () => {
  const study = m.updateStudyDetails(sampleStudy(testEnv()), { name: 'SAMPLE v2', prototypeType: 'other' });
  assertEqual([study.name, study.prototypeType], ['SAMPLE v2', 'other']);
});

test('FR1: adds screens in order', () => {
  assertEqual(sampleStudy(testEnv()).screens.map((s) => s.name), ['Home', 'Menu', 'Settings']);
});

test('FR1: rejects an empty screen name', () => {
  assertModelError(() => m.addScreen(sampleStudy(testEnv()), '  ', testEnv()), 'empty-name');
});

test('FR1: rejects a duplicate screen name, ignoring upper/lower case', () => {
  assertModelError(() => m.addScreen(sampleStudy(testEnv()), 'home', testEnv()), 'duplicate-screen');
});

test('FR1: renames a screen', () => {
  const study = sampleStudy(testEnv());
  const renamed = m.renameScreen(study, study.screens[1].id, 'Main menu');
  assertEqual(renamed.screens.map((s) => s.name), ['Home', 'Main menu', 'Settings']);
});

test('FR1: renaming to another screen\'s name is rejected', () => {
  const study = sampleStudy(testEnv());
  assertModelError(() => m.renameScreen(study, study.screens[1].id, 'HOME'), 'duplicate-screen');
});

test('FR1: renaming a screen only by upper/lower case is allowed', () => {
  const study = sampleStudy(testEnv());
  assertEqual(m.renameScreen(study, study.screens[0].id, 'HOME').screens[0].name, 'HOME');
});

test('FR1: renaming a screen updates all its findings (D4)', () => {
  const env = testEnv();
  let study = withSession(env);
  const menuId = study.screens[1].id;
  study = m.addFinding(study, { screenId: menuId, type: 'pain', note: 'SAMPLE a' }, env).study;
  study = m.addFinding(study, { screenId: menuId, type: 'positive', note: 'SAMPLE b' }, env).study;
  study = m.renameScreen(study, menuId, 'Main menu');
  assertEqual(study.findings.map((f) => m.findScreen(study, f.screenId).name), ['Main menu', 'Main menu']);
});

test('FR1: moves a screen to a new position', () => {
  const study = sampleStudy(testEnv());
  const moved = m.moveScreen(study, study.screens[2].id, 0);
  assertEqual(moved.screens.map((s) => s.name), ['Settings', 'Home', 'Menu']);
});

test('FR1: moving past the end keeps the screen at the end', () => {
  const study = sampleStudy(testEnv());
  const moved = m.moveScreen(study, study.screens[0].id, 99);
  assertEqual(moved.screens.map((s) => s.name), ['Menu', 'Settings', 'Home']);
});

test('FR1: removes a screen without findings', () => {
  const study = sampleStudy(testEnv());
  assertEqual(m.removeScreen(study, study.screens[1].id).screens.map((s) => s.name), ['Home', 'Settings']);
});

test('FR1: a screen with findings cannot be removed and says how many (D4)', () => {
  const env = testEnv();
  let study = withSession(env);
  const homeId = study.screens[0].id;
  study = m.addFinding(study, { screenId: homeId, type: 'pain', note: 'SAMPLE a' }, env).study;
  study = m.addFinding(study, { screenId: homeId, type: 'pain', note: 'SAMPLE b' }, env).study;
  const err = assertModelError(() => m.removeScreen(study, homeId), 'screen-in-use');
  assertEqual(err.message.includes('2 findings'), true, 'message names the count:');
});

test('FR1: typing an existing screen name in the log form picks that screen', () => {
  const env = testEnv();
  const study = sampleStudy(env);
  const result = m.findOrAddScreen(study, ' menu ', env);
  assertEqual(result.screenId, study.screens[1].id);
  assertEqual(result.study.screens.length, 3);
});

test('FR1: typing a new screen name in the log form adds it to the list', () => {
  const env = testEnv();
  const result = m.findOrAddScreen(sampleStudy(env), 'Checkout', env);
  assertEqual(result.study.screens.map((s) => s.name), ['Home', 'Menu', 'Settings', 'Checkout']);
  assertEqual(m.findScreen(result.study, result.screenId).name, 'Checkout');
});

test('FR1: a session cannot start without at least one screen', () => {
  const env = testEnv();
  const study = m.createStudy({ name: 'SAMPLE', prototypeType: 'figma' }, env);
  assertEqual(m.canStartSession(study).ok, false);
  assertModelError(() => m.startSession(study, 'P1', env), 'cannot-start');
});

test('FR1: a session can start once a screen exists', () => {
  assertEqual(m.canStartSession(sampleStudy(testEnv(), ['Home'])).ok, true);
});

test('FR1: copy for next round keeps name and screens only (D1)', () => {
  const env = testEnv();
  let study = withSession(env);
  study = m.addFinding(study, { screenId: study.screens[0].id, type: 'pain', note: 'SAMPLE' }, env).study;
  study = m.addFeedback(study, { receivedOn: '2026-09-24', text: 'SAMPLE' }, env);
  const next = m.copyStudyForNextRound(study, env);
  assertEqual(next.name, study.name);
  assertEqual(next.prototypeType, study.prototypeType);
  assertEqual(next.round, 2);
  assertEqual(next.screens.map((s) => s.name), ['Home', 'Menu', 'Settings']);
  assertEqual([next.sessions, next.findings, next.feedback, next.lastExportedAt], [[], [], [], null]);
  assertEqual(next.id === study.id, false, 'new study id:');
});

// ---------- FR2: participants and sessions ----------

for (const [input, expected] of [['P1', 'P1'], ['p12', 'P12'], ['p3', 'P3'], [' P7 ', 'P7'], ['P999999', 'P999999']]) {
  test(`FR2: accepts '${input}' as ${expected}`, () => {
    assertEqual(m.validateParticipantId(input), { ok: true, id: expected });
  });
}

for (const input of ['Anna', 'P', 'P0', 'P03', 'P1a', '1', 'P 1', '', 'PP1', 'P-1', 'P1.5', 'P1000000', 'Ｐ１']) {
  test(`FR2: rejects '${input}' with an inline message`, () => {
    const result = m.validateParticipantId(input);
    assertEqual(result.ok, false);
    assertEqual(typeof result.message === 'string' && result.message.length > 0, true, 'has message:');
  });
}

test('FR2: rejects a participant ID that is not text', () => {
  assertEqual(m.validateParticipantId(undefined).ok, false);
  assertEqual(m.validateParticipantId(3).ok, false);
});

test('FR2: starting a session with a bad ID is refused', () => {
  const env = testEnv();
  assertModelError(() => m.startSession(sampleStudy(env), 'Anna', env), 'bad-participant');
});

test('FR2: starting a session stores the cleaned ID and start time', () => {
  const env = testEnv();
  const { study, sessionId } = m.startSession(sampleStudy(env), 'p4', env);
  const session = study.sessions.find((s) => s.id === sessionId);
  assertEqual(session.participantId, 'P4');
  assertEqual(typeof session.startedAt, 'string');
  assertEqual(session.endedAt, null);
});

test('FR2: suggests P1 for the first session', () => {
  assertEqual(m.suggestNextParticipantId(sampleStudy(testEnv())), 'P1');
});

test('FR2: suggests P1 → P2 → P3', () => {
  const env = testEnv();
  let study = sampleStudy(env);
  const suggested = [];
  for (let i = 0; i < 3; i++) {
    const id = m.suggestNextParticipantId(study);
    suggested.push(id);
    const started = m.startSession(study, id, env);
    study = m.endSession(started.study, started.sessionId, env);
  }
  assertEqual(suggested, ['P1', 'P2', 'P3']);
});

test('FR2: with gaps, suggests one more than the highest (P1, P5 → P6)', () => {
  const env = testEnv();
  let study = sampleStudy(env);
  for (const id of ['P1', 'P5']) {
    const started = m.startSession(study, id, env);
    study = m.endSession(started.study, started.sessionId, env);
  }
  assertEqual(m.suggestNextParticipantId(study), 'P6');
});

test('FR2: a reused participant ID is detected for a warning but allowed (D5)', () => {
  const env = testEnv();
  const first = m.startSession(sampleStudy(env), 'P1', env);
  const study = m.endSession(first.study, first.sessionId, env);
  assertEqual(m.isParticipantIdUsed(study, 'P1'), true);
  assertEqual(m.isParticipantIdUsed(study, 'P2'), false);
  assertEqual(m.startSession(study, 'P1', env).study.sessions.length, 2);
});

test('FR2: only one session can run at a time (D12)', () => {
  const env = testEnv();
  const study = withSession(env);
  assertEqual(m.canStartSession(study).ok, false);
  assertModelError(() => m.startSession(study, 'P2', env), 'cannot-start');
});

test('FR2: finds the running session across all studies (D12)', () => {
  const env = testEnv();
  const idle = sampleStudy(env);
  const busy = withSession(env, 'P3');
  const found = m.findActiveSession([idle, busy]);
  assertEqual([found.study.id, found.session.participantId], [busy.id, 'P3']);
  assertEqual(m.findActiveSession([idle]), undefined);
});

test('FR2: ending a session records the end time (D13)', () => {
  const env = testEnv();
  const { study, sessionId } = m.startSession(sampleStudy(env), 'P1', env);
  const ended = m.endSession(study, sessionId, env);
  assertEqual(typeof ended.sessions[0].endedAt, 'string');
  assertEqual(m.activeSession(ended), undefined);
  assertModelError(() => m.endSession(ended, sessionId, env), 'already-ended');
});

// ---------- FR3: live logging ----------

test('FR3: a finding records participant, screen, type, note and time', () => {
  const env = testEnv();
  const start = withSession(env, 'P2');
  const { study, findingId } = m.addFinding(start, { screenId: start.screens[1].id, type: 'pain', note: 'SAMPLE note' }, env);
  const finding = study.findings.find((f) => f.id === findingId);
  assertEqual(m.participantOfFinding(study, finding), 'P2');
  assertEqual(m.findScreen(study, finding.screenId).name, 'Menu');
  assertEqual([finding.type, finding.note], ['pain', 'SAMPLE note']);
  assertEqual(typeof finding.time, 'string');
});

test('FR3: a finding needs a running session', () => {
  const env = testEnv();
  const study = sampleStudy(env);
  assertModelError(() => m.addFinding(study, { screenId: study.screens[0].id, type: 'pain', note: 'SAMPLE' }, env), 'no-active-session');
});

test('FR3: rejects an empty note', () => {
  const env = testEnv();
  const study = withSession(env);
  assertModelError(() => m.addFinding(study, { screenId: study.screens[0].id, type: 'pain', note: ' \n ' }, env), 'empty-text');
});

test('FR3: rejects an unknown screen', () => {
  const env = testEnv();
  const study = withSession(env);
  assertModelError(() => m.addFinding(study, { screenId: 'nope', type: 'pain', note: 'SAMPLE' }, env), 'no-screen');
});

test('FR3: rejects a type other than pain or positive', () => {
  const env = testEnv();
  const study = withSession(env);
  assertModelError(() => m.addFinding(study, { screenId: study.screens[0].id, type: 'severe', note: 'SAMPLE' }, env), 'bad-finding-type');
});

test('FR3: keeps line breaks inside a note (Shift+Enter, D3)', () => {
  const env = testEnv();
  const start = withSession(env);
  const { study } = m.addFinding(start, { screenId: start.screens[0].id, type: 'pain', note: '  line 1\nline 2  ' }, env);
  assertEqual(study.findings[0].note, 'line 1\nline 2');
});

test('FR3: keeps digits and special characters in a note', () => {
  const env = testEnv();
  const start = withSession(env);
  const note = 'Tapped 3 times ¡† <b>not bold</b> 한국어';
  const { study } = m.addFinding(start, { screenId: start.screens[0].id, type: 'positive', note }, env);
  assertEqual(study.findings[0].note, note);
});

test('FR3: Alt+T toggle switches pain ↔ positive', () => {
  assertEqual(m.toggleFindingType('pain'), 'positive');
  assertEqual(m.toggleFindingType('positive'), 'pain');
});

test('FR3: recent findings are newest first', () => {
  const env = testEnv();
  let study = withSession(env);
  for (const note of ['SAMPLE 1', 'SAMPLE 2', 'SAMPLE 3']) {
    study = m.addFinding(study, { screenId: study.screens[0].id, type: 'pain', note }, env).study;
  }
  assertEqual(m.recentFindings(study, 2).map((f) => f.note), ['SAMPLE 3', 'SAMPLE 2']);
});

test('FR3: 10 findings in a row are all stored', () => {
  const env = testEnv();
  let study = withSession(env);
  for (let i = 1; i <= 10; i++) {
    const screenId = study.screens[i % 3].id;
    study = m.addFinding(study, { screenId, type: i % 2 ? 'pain' : 'positive', note: `SAMPLE ${i}` }, env).study;
  }
  assertEqual(study.findings.length, 10);
  assertEqual(new Set(study.findings.map((f) => f.id)).size, 10, 'unique ids:');
});

// ---------- FR4: review and edit ----------

function reviewStudy() {
  const env = testEnv();
  let study = sampleStudy(env);
  const [home, menu] = study.screens.map((s) => s.id);
  const plan = [
    ['P1', [[home, 'pain', 'SAMPLE a'], [menu, 'positive', 'SAMPLE b']]],
    ['P2', [[home, 'pain', 'SAMPLE c'], [home, 'positive', 'SAMPLE d']]],
  ];
  for (const [participant, findings] of plan) {
    const started = m.startSession(study, participant, env);
    study = started.study;
    for (const [screenId, type, note] of findings) {
      study = m.addFinding(study, { screenId, type, note }, env).study;
    }
    study = m.endSession(study, started.sessionId, env);
  }
  return { study, home, menu };
}

const notes = (findings) => findings.map((f) => f.note);

test('FR4: edits a finding\'s note, type and screen after the session ended', () => {
  const { study, menu } = reviewStudy();
  const id = study.findings[0].id;
  const edited = m.editFinding(study, id, { note: 'SAMPLE fixed', type: 'positive', screenId: menu });
  const f = edited.findings.find((x) => x.id === id);
  assertEqual([f.note, f.type, f.screenId], ['SAMPLE fixed', 'positive', menu]);
  assertEqual(m.participantOfFinding(edited, f), 'P1', 'participant unchanged:');
});

test('FR4: editing keeps unchanged fields', () => {
  const { study } = reviewStudy();
  const before = study.findings[1];
  const after = m.editFinding(study, before.id, { note: 'SAMPLE typo fixed' }).findings[1];
  assertEqual([after.type, after.screenId, after.time], [before.type, before.screenId, before.time]);
});

test('FR4: editing to an empty note is rejected', () => {
  const { study } = reviewStudy();
  assertModelError(() => m.editFinding(study, study.findings[0].id, { note: '' }), 'empty-text');
});

test('FR4: deletes a finding', () => {
  const { study } = reviewStudy();
  const after = m.deleteFinding(study, study.findings[0].id);
  assertEqual(notes(after.findings), ['SAMPLE b', 'SAMPLE c', 'SAMPLE d']);
  assertModelError(() => m.deleteFinding(after, study.findings[0].id), 'no-finding');
});

test('FR4: filters by participant', () => {
  const { study } = reviewStudy();
  assertEqual(notes(m.filterFindings(study, { participantId: 'P2' })), ['SAMPLE c', 'SAMPLE d']);
});

test('FR4: filters by screen', () => {
  const { study, menu } = reviewStudy();
  assertEqual(notes(m.filterFindings(study, { screenId: menu })), ['SAMPLE b']);
});

test('FR4: filters by type', () => {
  const { study } = reviewStudy();
  assertEqual(notes(m.filterFindings(study, { type: 'positive' })), ['SAMPLE b', 'SAMPLE d']);
});

test('FR4: combined filters must all match', () => {
  const { study, home } = reviewStudy();
  assertEqual(notes(m.filterFindings(study, { participantId: 'P2', screenId: home, type: 'pain' })), ['SAMPLE c']);
});

test('FR4: no filters shows all findings', () => {
  const { study } = reviewStudy();
  assertEqual(m.filterFindings(study).length, 4);
});

// ---------- FR7: last exported ----------

test('FR7: records when the study was last exported', () => {
  const env = testEnv();
  const study = m.markExported(sampleStudy(env), env);
  assertEqual(typeof study.lastExportedAt, 'string');
});

// ---------- FR8: feedback received ----------

test('FR8: 0 responses shows "below target"', () => {
  assertEqual(m.feedbackStatus(sampleStudy(testEnv())), { count: 0, target: 2, met: false, label: 'below target' });
});

test('FR8: after 1 response the round shows "below target"', () => {
  const env = testEnv();
  const study = m.addFeedback(sampleStudy(env), { receivedOn: '2026-09-24', text: 'SAMPLE useful' }, env);
  assertEqual(m.feedbackStatus(study), { count: 1, target: 2, met: false, label: 'below target' });
});

test('FR8: after a 2nd response the round shows "target met"', () => {
  const env = testEnv();
  let study = sampleStudy(env);
  study = m.addFeedback(study, { receivedOn: '2026-09-24', text: 'SAMPLE one' }, env);
  study = m.addFeedback(study, { receivedOn: '2026-09-25', text: 'SAMPLE two' }, env);
  assertEqual(m.feedbackStatus(study), { count: 2, target: 2, met: true, label: 'target met' });
});

test('FR8: the count follows the logged feedback, also after a delete (D11)', () => {
  const env = testEnv();
  let study = sampleStudy(env);
  study = m.addFeedback(study, { receivedOn: '2026-09-24', text: 'SAMPLE one' }, env);
  study = m.addFeedback(study, { receivedOn: '2026-09-25', text: 'SAMPLE two' }, env);
  study = m.deleteFeedback(study, study.feedback[0].id);
  assertEqual(m.feedbackStatus(study).label, 'below target');
  assertEqual('feedbackCount' in study, false, 'no stored count:');
});

test('FR8: feedback stores only the date and the text', () => {
  const env = testEnv();
  const study = m.addFeedback(sampleStudy(env), { receivedOn: '2026-09-24', text: 'SAMPLE', from: 'Anna' }, env);
  assertEqual(Object.keys(study.feedback[0]).sort(), ['id', 'receivedOn', 'text']);
});

test('FR8: rejects empty feedback text', () => {
  const env = testEnv();
  assertModelError(() => m.addFeedback(sampleStudy(env), { receivedOn: '2026-09-24', text: ' ' }, env), 'empty-text');
});

for (const date of ['', '24.09.2026', '2026-02-30', '2026-13-01', undefined]) {
  test(`FR8: rejects the date '${date}'`, () => {
    const env = testEnv();
    assertModelError(() => m.addFeedback(sampleStudy(env), { receivedOn: date, text: 'SAMPLE' }, env), 'bad-date');
  });
}

// ---------- Privacy (FR2, FR8, definition of done) ----------

// If this fails because a field was added, check it is not personal data before updating the list.
test('FR2: a full study stores only the allowed fields (no names or contact details)', () => {
  const env = testEnv();
  let study = withSession(env);
  study = m.addFinding(study, { screenId: study.screens[0].id, type: 'pain', note: 'SAMPLE', name: 'Anna' }, env).study;
  study = m.endSession(study, study.sessions[0].id, env);
  study = m.addFeedback(study, { receivedOn: '2026-09-24', text: 'SAMPLE' }, env);
  study = m.markExported(study, env);
  const allowed = {
    study: ['createdAt', 'feedback', 'findings', 'id', 'lastExportedAt', 'name', 'prototypeType', 'round', 'screens', 'sessions'],
    screen: ['id', 'name'],
    session: ['endedAt', 'id', 'participantId', 'startedAt'],
    finding: ['id', 'note', 'screenId', 'sessionId', 'time', 'type'],
    feedback: ['id', 'receivedOn', 'text'],
  };
  assertEqual(Object.keys(study).sort(), allowed.study, 'study:');
  assertEqual(Object.keys(study.screens[0]).sort(), allowed.screen, 'screen:');
  assertEqual(Object.keys(study.sessions[0]).sort(), allowed.session, 'session:');
  assertEqual(Object.keys(study.findings[0]).sort(), allowed.finding, 'finding:');
  assertEqual(Object.keys(study.feedback[0]).sort(), allowed.feedback, 'feedback:');
});

// ---------- General ----------

test('FR1: changes return a new study and never alter the old one', () => {
  const env = testEnv();
  const study = sampleStudy(env);
  const snapshot = JSON.stringify(study);
  m.addScreen(study, 'Checkout', env);
  m.renameScreen(study, study.screens[0].id, 'Start');
  m.moveScreen(study, study.screens[0].id, 2);
  m.startSession(study, 'P1', env);
  assertEqual(JSON.stringify(study), snapshot);
});
