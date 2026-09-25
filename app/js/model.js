// The app's rules, with no screen code and no storage code.
// Every function takes a study and returns a NEW study; the old one is never
// changed. Rules that break throw a ModelError whose message can be shown
// to the note-taker as is.
//
// Study shape (the only fields that may be stored — see the privacy test):
// {
//   id, name, prototypeType, round, createdAt, lastExportedAt,
//   screens:  [{ id, name }],
//   sessions: [{ id, participantId, startedAt, endedAt }],
//   findings: [{ id, sessionId, screenId, type, note, time }],
//   feedback: [{ id, receivedOn, text }],
// }
// Findings point to screens by id, so renaming a screen updates every finding.

export const PROTOTYPE_TYPES = ['figma', 'in-vehicle', 'other'];
export const PROTOTYPE_TYPE_LABELS = {
  figma: 'Figma click-through',
  'in-vehicle': 'In-vehicle / display',
  other: 'Other',
};
export const FINDING_TYPES = ['pain', 'positive'];
export const FEEDBACK_TARGET = 2;

const MAX_NAME_LENGTH = 200;
const PARTICIPANT_PATTERN = /^P([1-9]\d{0,5})$/;

export class ModelError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ModelError';
    this.code = code;
  }
}

// `env` supplies the clock and new ids, so tests can use fixed values.
export const defaultEnv = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
};

function cleanName(value, what) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name === '') throw new ModelError(`${what} cannot be empty.`, 'empty-name');
  if (name.length > MAX_NAME_LENGTH) {
    throw new ModelError(`${what} is too long (max ${MAX_NAME_LENGTH} characters).`, 'name-too-long');
  }
  return name;
}

function cleanText(value, what) {
  // Keep line breaks inside the text; only drop spaces at the start and end.
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') throw new ModelError(`${what} cannot be empty.`, 'empty-text');
  return text;
}

function checkPrototypeType(type) {
  if (!PROTOTYPE_TYPES.includes(type)) {
    throw new ModelError('Choose a prototype type.', 'bad-prototype-type');
  }
  return type;
}

function checkFindingType(type) {
  if (!FINDING_TYPES.includes(type)) {
    throw new ModelError('Type must be pain point or positive moment.', 'bad-finding-type');
  }
  return type;
}

function sameName(a, b) {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

// ---------- FR1: study and screens ----------

export function createStudy({ name, prototypeType }, env = defaultEnv) {
  return {
    id: env.newId(),
    name: cleanName(name, 'Study name'),
    prototypeType: checkPrototypeType(prototypeType),
    round: 1,
    createdAt: env.now(),
    lastExportedAt: null,
    screens: [],
    sessions: [],
    findings: [],
    feedback: [],
  };
}

export function updateStudyDetails(study, { name, prototypeType }) {
  return {
    ...study,
    name: name === undefined ? study.name : cleanName(name, 'Study name'),
    prototypeType: prototypeType === undefined
      ? study.prototypeType : checkPrototypeType(prototypeType),
  };
}

// D1: the next round keeps the name and screen list, nothing else.
export function copyStudyForNextRound(study, env = defaultEnv) {
  return {
    ...createStudy({ name: study.name, prototypeType: study.prototypeType }, env),
    round: study.round + 1,
    screens: study.screens.map((s) => ({ id: env.newId(), name: s.name })),
  };
}

export function findScreen(study, screenId) {
  return study.screens.find((s) => s.id === screenId);
}

function requireScreen(study, screenId) {
  const screen = findScreen(study, screenId);
  if (!screen) throw new ModelError('That screen no longer exists.', 'no-screen');
  return screen;
}

function checkUniqueScreenName(study, name, exceptId) {
  const clash = study.screens.find((s) => s.id !== exceptId && sameName(s.name, name));
  if (clash) throw new ModelError(`A screen called "${clash.name}" already exists.`, 'duplicate-screen');
}

export function addScreen(study, name, env = defaultEnv) {
  const clean = cleanName(name, 'Screen name');
  checkUniqueScreenName(study, clean);
  return { ...study, screens: [...study.screens, { id: env.newId(), name: clean }] };
}

// FR1: a screen name typed in the log form picks the existing screen
// (ignoring upper/lower case) or adds a new one to the list.
export function findOrAddScreen(study, name, env = defaultEnv) {
  const clean = cleanName(name, 'Screen name');
  const existing = study.screens.find((s) => sameName(s.name, clean));
  if (existing) return { study, screenId: existing.id };
  const next = addScreen(study, clean, env);
  return { study: next, screenId: next.screens[next.screens.length - 1].id };
}

export function renameScreen(study, screenId, name) {
  requireScreen(study, screenId);
  const clean = cleanName(name, 'Screen name');
  checkUniqueScreenName(study, clean, screenId);
  return {
    ...study,
    screens: study.screens.map((s) => (s.id === screenId ? { ...s, name: clean } : s)),
  };
}

export function moveScreen(study, screenId, toIndex) {
  const from = study.screens.findIndex((s) => s.id === screenId);
  if (from === -1) throw new ModelError('That screen no longer exists.', 'no-screen');
  const to = Math.max(0, Math.min(study.screens.length - 1, toIndex));
  const screens = [...study.screens];
  const [moved] = screens.splice(from, 1);
  screens.splice(to, 0, moved);
  return { ...study, screens };
}

export function countFindingsOnScreen(study, screenId) {
  return study.findings.filter((f) => f.screenId === screenId).length;
}

// D4: a screen that has findings cannot be removed.
export function removeScreen(study, screenId) {
  requireScreen(study, screenId);
  const count = countFindingsOnScreen(study, screenId);
  if (count > 0) {
    throw new ModelError(
      `This screen has ${count} finding${count === 1 ? '' : 's'} and cannot be removed. Rename it instead.`,
      'screen-in-use');
  }
  return { ...study, screens: study.screens.filter((s) => s.id !== screenId) };
}

// ---------- FR2: sessions and participants ----------

// Returns { ok: true, id: 'P3' } or { ok: false, message } for an inline message.
// D5: "p3" becomes "P3"; P0 and leading zeros are rejected.
export function validateParticipantId(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  const upper = value.charAt(0).toUpperCase() + value.slice(1);
  if (PARTICIPANT_PATTERN.test(upper)) return { ok: true, id: upper };
  return {
    ok: false,
    message: 'Use P followed by a number, like P1 or P12. No names or other details.',
  };
}

function participantNumber(id) {
  const match = PARTICIPANT_PATTERN.exec(id);
  return match ? Number(match[1]) : 0;
}

// FR2: one more than the highest ID used so far (P1, P3 → P4), so an ID is never reused by accident.
export function suggestNextParticipantId(study) {
  const highest = Math.max(0, ...study.sessions.map((s) => participantNumber(s.participantId)));
  return `P${highest + 1}`;
}

// D5: an ID already used in this study is allowed, but the screen should warn.
export function isParticipantIdUsed(study, participantId) {
  return study.sessions.some((s) => s.participantId === participantId);
}

export function activeSession(study) {
  return study.sessions.find((s) => s.endedAt === null);
}

// D12: only one session may be running, across all studies.
export function findActiveSession(studies) {
  for (const study of studies) {
    const session = activeSession(study);
    if (session) return { study, session };
  }
  return undefined;
}

// FR1 acceptance: a session needs at least one screen.
export function canStartSession(study) {
  if (study.screens.length === 0) {
    return { ok: false, message: 'Add at least one screen before starting a session.' };
  }
  if (activeSession(study)) {
    return { ok: false, message: 'End the current session before starting a new one.' };
  }
  return { ok: true };
}

export function startSession(study, participantInput, env = defaultEnv) {
  const allowed = canStartSession(study);
  if (!allowed.ok) throw new ModelError(allowed.message, 'cannot-start');
  const participant = validateParticipantId(participantInput);
  if (!participant.ok) throw new ModelError(participant.message, 'bad-participant');
  const session = { id: env.newId(), participantId: participant.id, startedAt: env.now(), endedAt: null };
  return { study: { ...study, sessions: [...study.sessions, session] }, sessionId: session.id };
}

// D13: ending a session records the end time; findings stay editable.
export function endSession(study, sessionId, env = defaultEnv) {
  const session = study.sessions.find((s) => s.id === sessionId);
  if (!session) throw new ModelError('That session no longer exists.', 'no-session');
  if (session.endedAt !== null) throw new ModelError('This session has already ended.', 'already-ended');
  return {
    ...study,
    sessions: study.sessions.map((s) => (s.id === sessionId ? { ...s, endedAt: env.now() } : s)),
  };
}

// ---------- FR3 / FR4: findings ----------

export function toggleFindingType(type) {
  return type === 'pain' ? 'positive' : 'pain';
}

// FR3: participant and time are filled in automatically from the running session.
export function addFinding(study, { screenId, type, note }, env = defaultEnv) {
  const session = activeSession(study);
  if (!session) throw new ModelError('Start a session before logging findings.', 'no-active-session');
  requireScreen(study, screenId);
  const finding = {
    id: env.newId(),
    sessionId: session.id,
    screenId,
    type: checkFindingType(type),
    note: cleanText(note, 'Note'),
    time: env.now(),
  };
  return { study: { ...study, findings: [...study.findings, finding] }, findingId: finding.id };
}

function requireFinding(study, findingId) {
  const finding = study.findings.find((f) => f.id === findingId);
  if (!finding) throw new ModelError('That finding no longer exists.', 'no-finding');
  return finding;
}

// FR4: screen, type and note can be changed at any time, also after the session ended.
export function editFinding(study, findingId, { screenId, type, note }) {
  const finding = requireFinding(study, findingId);
  const changed = {
    ...finding,
    screenId: screenId === undefined ? finding.screenId : requireScreen(study, screenId).id,
    type: type === undefined ? finding.type : checkFindingType(type),
    note: note === undefined ? finding.note : cleanText(note, 'Note'),
  };
  return { ...study, findings: study.findings.map((f) => (f.id === findingId ? changed : f)) };
}

// D16: permanent; the screen asks for confirmation first.
export function deleteFinding(study, findingId) {
  requireFinding(study, findingId);
  return { ...study, findings: study.findings.filter((f) => f.id !== findingId) };
}

export function participantOfFinding(study, finding) {
  const session = study.sessions.find((s) => s.id === finding.sessionId);
  return session ? session.participantId : undefined;
}

// FR3: newest first.
export function recentFindings(study, limit = 5) {
  return [...study.findings].reverse().slice(0, limit);
}

// FR4: any filter left empty matches everything.
export function filterFindings(study, { participantId, screenId, type } = {}) {
  return study.findings.filter((f) =>
    (!participantId || participantOfFinding(study, f) === participantId)
    && (!screenId || f.screenId === screenId)
    && (!type || f.type === type));
}

// ---------- FR7: export time ----------

export function markExported(study, env = defaultEnv) {
  return { ...study, lastExportedAt: env.now() };
}

// ---------- FR8: feedback received ----------

// A real calendar date written as YYYY-MM-DD (so 2026-02-30 is refused).
function checkDate(value) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`) : null;
  const ok = date !== null && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  if (!ok) throw new ModelError('Enter the date the feedback was received.', 'bad-date');
  return value;
}

// Stores only the date and the text — never who sent it.
export function addFeedback(study, { receivedOn, text }, env = defaultEnv) {
  const item = { id: env.newId(), receivedOn: checkDate(receivedOn), text: cleanText(text, 'Feedback') };
  return { ...study, feedback: [...study.feedback, item] };
}

export function deleteFeedback(study, feedbackId) {
  if (!study.feedback.some((f) => f.id === feedbackId)) {
    throw new ModelError('That feedback no longer exists.', 'no-feedback');
  }
  return { ...study, feedback: study.feedback.filter((f) => f.id !== feedbackId) };
}

// D11: the count is always worked out from the logged feedback, never stored.
export function feedbackStatus(study) {
  const count = study.feedback.length;
  const met = count >= FEEDBACK_TARGET;
  return { count, target: FEEDBACK_TARGET, met, label: met ? 'target met' : 'below target' };
}
