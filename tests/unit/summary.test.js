import { test, assertEqual } from './runner.js';
import { toMarkdown, buildSummary, summaryFileName, FEEDBACK_REQUEST } from '../../app/js/summary.js';
import {
  createStudy, addScreen, startSession, endSession, addFinding, editFinding,
} from '../../app/js/model.js';

// Times are at midday UTC, so the local date is the same in every time zone
// from UTC-11 to UTC+11 (the test machines on GitHub run in UTC).
function sampleEnv() {
  let n = 0;
  let clock = '2026-09-24T12:00:00.000Z';
  return {
    newId: () => `id-${++n}`,
    now: () => clock,
    at(iso) { clock = iso; },
  };
}

// Round 2 of a SAMPLE study: 3 sessions (P1, P2, P3), 4 screens.
// Home: 3 pain from 2 participants. Menu: 2 pain from 2 participants + 1 positive.
// Settings: 1 positive. Help: nothing.
function sampleStudy() {
  const env = sampleEnv();
  let study = createStudy({ name: 'SAMPLE checkout test', prototypeType: 'figma' }, env);
  study = { ...study, round: 2 };
  for (const name of ['Settings', 'Home', 'Menu', 'Help']) study = addScreen(study, name, env);
  const [settings, home, menu] = study.screens.map((s) => s.id);

  const session = (participant, day, findings) => {
    env.at(`2026-09-${day}T12:00:00.000Z`);
    let started = startSession(study, participant, env);
    study = started.study;
    findings.forEach(([screenId, type, note], i) => {
      env.at(`2026-09-${day}T12:${String(i + 1).padStart(2, '0')}:00.000Z`);
      study = addFinding(study, { screenId, type, note }, env).study;
    });
    study = endSession(study, started.sessionId, env);
  };

  session('P1', '24', [
    [menu, 'positive', 'SAMPLE likes the icons'],
    [home, 'pain', 'SAMPLE slow login'],
    [menu, 'pain', 'SAMPLE menu too deep'],
  ]);
  session('P2', '25', [
    [home, 'pain', 'SAMPLE cannot find back'],
    [home, 'pain', 'SAMPLE back button\nhidden behind banner'],
    [settings, 'positive', 'SAMPLE clear toggles'],
  ]);
  session('P3', '26', [
    [menu, 'pain', 'SAMPLE labels unclear'],
  ]);
  return study;
}

test('FR5: the summary Markdown matches the expected text exactly (D6, D8, D14, D15, D26)', () => {
  const expected = [
    '# Test summary: SAMPLE checkout test',
    '',
    '- Prototype type: Figma click-through',
    '- Round: 2',
    '- Dates: 2026-09-24 to 2026-09-26',
    '- Participants: 3',
    '',
    '## Home',
    '',
    '- Pain points: 3',
    '- Positive moments: 0',
    '- Participants with a pain point: 2',
    '',
    '### Pain points',
    '',
    '- P1: SAMPLE slow login',
    '- P2: SAMPLE cannot find back',
    '- P2: SAMPLE back button',
    '  hidden behind banner',
    '',
    '## Menu',
    '',
    '- Pain points: 2',
    '- Positive moments: 1',
    '- Participants with a pain point: 2',
    '',
    '### Pain points',
    '',
    '- P1: SAMPLE menu too deep',
    '- P3: SAMPLE labels unclear',
    '',
    '### Positive moments',
    '',
    '- P1: SAMPLE likes the icons',
    '',
    '## Settings',
    '',
    '- Pain points: 0',
    '- Positive moments: 1',
    '- Participants with a pain point: 0',
    '',
    '### Positive moments',
    '',
    '- P2: SAMPLE clear toggles',
    '',
    '## No findings',
    '',
    '- Help',
    '',
    '## Feedback',
    '',
    "Reply to this message with one thing that was useful and one thing you'll act on.",
    '',
  ].join('\n');
  assertEqual(toMarkdown(sampleStudy()), expected);
});

test('FR5: screens are ordered by participants with a pain point, then pain count (D15)', () => {
  // Home and Menu both have 2 participants with pain; Home has more pain points.
  assertEqual(buildSummary(sampleStudy()).screens.map((s) => s.name), ['Home', 'Menu', 'Settings']);
});

test('FR5: a full tie keeps the screen-list order (D15)', () => {
  const env = sampleEnv();
  let study = createStudy({ name: 'SAMPLE tie', prototypeType: 'other' }, env);
  for (const name of ['B screen', 'A screen']) study = addScreen(study, name, env);
  study = startSession(study, 'P1', env).study;
  study = addFinding(study, { screenId: study.screens[1].id, type: 'pain', note: 'SAMPLE a' }, env).study;
  study = addFinding(study, { screenId: study.screens[0].id, type: 'pain', note: 'SAMPLE b' }, env).study;
  assertEqual(buildSummary(study).screens.map((s) => s.name), ['B screen', 'A screen']);
});

test('FR5: breadth beats count — 2 participants with 2 pain points rank above 1 participant with 3', () => {
  const env = sampleEnv();
  let study = createStudy({ name: 'SAMPLE breadth', prototypeType: 'other' }, env);
  for (const name of ['Deep', 'Broad']) study = addScreen(study, name, env);
  const [deep, broad] = study.screens.map((s) => s.id);
  let first = startSession(study, 'P1', env);
  study = first.study;
  for (const note of ['SAMPLE 1', 'SAMPLE 2', 'SAMPLE 3']) {
    study = addFinding(study, { screenId: deep, type: 'pain', note }, env).study;
  }
  study = addFinding(study, { screenId: broad, type: 'pain', note: 'SAMPLE 4' }, env).study;
  study = endSession(study, first.sessionId, env);
  study = startSession(study, 'P2', env).study;
  study = addFinding(study, { screenId: broad, type: 'pain', note: 'SAMPLE 5' }, env).study;
  assertEqual(buildSummary(study).screens.map((s) => s.name), ['Broad', 'Deep']);
});

test('FR5: notes are oldest first even after a finding moved to another screen (D26)', () => {
  let study = sampleStudy();
  // Move P1's "menu too deep" (logged 24 Sep) to Home: it becomes the second Home pain point.
  const moved = study.findings.find((f) => f.note === 'SAMPLE menu too deep');
  study = editFinding(study, moved.id, { screenId: study.screens[1].id });
  const home = buildSummary(study).screens.find((s) => s.name === 'Home');
  assertEqual(home.pain.map((n) => n.note),
    ['SAMPLE slow login', 'SAMPLE menu too deep', 'SAMPLE cannot find back', 'SAMPLE back button\nhidden behind banner']);
});

test('FR5: a study without sessions still gives a summary, ending with the feedback request', () => {
  const env = sampleEnv();
  let study = createStudy({ name: 'SAMPLE empty', prototypeType: 'in-vehicle' }, env);
  study = addScreen(study, 'Home', env);
  assertEqual(toMarkdown(study), [
    '# Test summary: SAMPLE empty',
    '',
    '- Prototype type: In-vehicle / display',
    '- Round: 1',
    '- Dates: no sessions yet',
    '- Participants: 0',
    '',
    '## No findings',
    '',
    '- Home',
    '',
    '## Feedback',
    '',
    FEEDBACK_REQUEST,
    '',
  ].join('\n'));
});

test('FR5: sessions on one day show a single date, and a reused ID counts once', () => {
  const env = sampleEnv();
  let study = addScreen(createStudy({ name: 'SAMPLE one day', prototypeType: 'figma' }, env), 'Home', env);
  for (const participant of ['P1', 'P1', 'P2']) {
    const started = startSession(study, participant, env);
    study = endSession(started.study, started.sessionId, env);
  }
  const markdown = toMarkdown(study);
  assertEqual(markdown.includes('- Dates: 2026-09-24\n'), true, 'single date');
  assertEqual(markdown.includes('- Participants: 2\n'), true, 'participants');
});

test('FR5: notes show the participant ID only, no time', () => {
  const markdown = toMarkdown(sampleStudy());
  assertEqual(/\d{1,2}:\d{2}/.test(markdown), false);
});

test('FR6: the download file name is "<study name> - summary - <date>.md" (D26)', () => {
  const study = sampleStudy();
  assertEqual(summaryFileName(study, new Date(2026, 8, 25, 9, 30)), 'SAMPLE checkout test - summary - 2026-09-25.md');
});

test('FR6: characters that file systems refuse are replaced in the file name', () => {
  const env = sampleEnv();
  const study = createStudy({ name: 'SAMPLE a/b: "v2"?', prototypeType: 'figma' }, env);
  assertEqual(summaryFileName(study, new Date(2026, 0, 5)), 'SAMPLE a-b- -v2- - summary - 2026-01-05.md');
  const korean = createStudy({ name: '한국어 테스트', prototypeType: 'figma' }, env);
  assertEqual(summaryFileName(korean, new Date(2026, 0, 5)), '한국어 테스트 - summary - 2026-01-05.md');
});
