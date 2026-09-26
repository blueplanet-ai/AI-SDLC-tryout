// Turns a study into a backup file and back (FR7). No screen code here.
// Import checks every field, so a broken or foreign file — or one with extra
// fields such as a name or email address — is refused with a clear message.

import { SCHEMA_VERSION } from './store.js';
import {
  ModelError, PROTOTYPE_TYPES, FINDING_TYPES, validateParticipantId, activeSession, findActiveSession,
  defaultEnv,
} from './model.js';

export const EXPORT_EXTENSION = '.study.json';
// Browser storage holds about 5 MB, so a bigger file cannot be a backup of it.
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

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

// ---------- Import ----------

function refuse(detail) {
  throw new ModelError(`Could not import this file: ${detail}`, 'bad-import');
}

const NOT_A_BACKUP = 'it is not a study backup from this app.';

// Only these fields may be in a backup; anything else is refused (privacy).
function checkFields(value, required, optional, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) refuse(`${where} is missing or damaged.`);
  for (const key of Object.keys(value)) {
    if (!required.includes(key) && !optional.includes(key)) refuse(`${where} has an unknown field "${key}".`);
  }
  for (const key of required) {
    if (!(key in value)) refuse(`${where} has no "${key}".`);
  }
}

function checkText(value, where, max = Infinity) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) refuse(`${where} is empty or damaged.`);
}

function checkTime(value, where, { allowNull = false } = {}) {
  if (allowNull && value === null) return;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) refuse(`${where} is not a valid time.`);
}

function checkList(value, where) {
  if (!Array.isArray(value)) refuse(`${where} is missing or damaged.`);
}

function checkUniqueIds(items, where) {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) refuse(`two ${where} have the same id.`);
}

// Returns the study inside a backup file's text, or throws a ModelError that
// can be shown to the note-taker as is.
export function parseExportText(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    refuse(NOT_A_BACKUP);
  }
  if (!file || typeof file !== 'object' || !('schemaVersion' in file) || !('study' in file)) refuse(NOT_A_BACKUP);
  if (typeof file.schemaVersion === 'number' && file.schemaVersion > SCHEMA_VERSION) {
    refuse('it was made by a newer version of the app. Reload the app to update it, then try again.');
  }
  if (file.schemaVersion !== SCHEMA_VERSION) refuse(NOT_A_BACKUP);
  checkFields(file, ['schemaVersion', 'study'], ['exportedAt'], 'The file');

  const study = file.study;
  checkFields(study,
    ['id', 'name', 'prototypeType', 'round', 'createdAt', 'lastExportedAt', 'screens', 'sessions', 'findings', 'feedback'],
    ['changedAt'], 'The study');
  checkText(study.id, 'The study id', 100);
  checkText(study.name, 'The study name', 200);
  if (!PROTOTYPE_TYPES.includes(study.prototypeType)) refuse('the prototype type is unknown.');
  if (!Number.isInteger(study.round) || study.round < 1) refuse('the round number is damaged.');
  checkTime(study.createdAt, 'The creation time');
  if ('changedAt' in study) checkTime(study.changedAt, 'The time of the last change');
  checkTime(study.lastExportedAt, 'The last export time', { allowNull: true });

  checkList(study.screens, 'The screen list');
  const names = new Set();
  study.screens.forEach((screen, i) => {
    const where = `Screen ${i + 1}`;
    checkFields(screen, ['id', 'name'], [], where);
    checkText(screen.id, `${where} id`, 100);
    checkText(screen.name, `${where} name`, 200);
    const lower = screen.name.toLocaleLowerCase();
    if (names.has(lower)) refuse(`two screens are called "${screen.name}".`);
    names.add(lower);
  });
  checkUniqueIds(study.screens, 'screens');

  checkList(study.sessions, 'The session list');
  study.sessions.forEach((session, i) => {
    const where = `Session ${i + 1}`;
    checkFields(session, ['id', 'participantId', 'startedAt', 'endedAt'], [], where);
    checkText(session.id, `${where} id`, 100);
    const participant = validateParticipantId(session.participantId);
    if (!participant.ok || participant.id !== session.participantId) {
      refuse(`${where} has a participant that is not P followed by a number.`);
    }
    checkTime(session.startedAt, `${where} start`);
    checkTime(session.endedAt, `${where} end`, { allowNull: true });
  });
  checkUniqueIds(study.sessions, 'sessions');
  if (study.sessions.filter((s) => s.endedAt === null).length > 1) refuse('it has more than one running session.');

  checkList(study.findings, 'The finding list');
  const screenIds = new Set(study.screens.map((s) => s.id));
  const sessionIds = new Set(study.sessions.map((s) => s.id));
  study.findings.forEach((finding, i) => {
    const where = `Finding ${i + 1}`;
    checkFields(finding, ['id', 'sessionId', 'screenId', 'type', 'note', 'time'], [], where);
    checkText(finding.id, `${where} id`, 100);
    if (!sessionIds.has(finding.sessionId)) refuse(`${where} belongs to a session that is not in the file.`);
    if (!screenIds.has(finding.screenId)) refuse(`${where} is on a screen that is not in the file.`);
    if (!FINDING_TYPES.includes(finding.type)) refuse(`${where} has an unknown type.`);
    checkText(finding.note, `${where} note`);
    checkTime(finding.time, `${where} time`);
  });
  checkUniqueIds(study.findings, 'findings');

  checkList(study.feedback, 'The feedback list');
  study.feedback.forEach((item, i) => {
    const where = `Feedback ${i + 1}`;
    checkFields(item, ['id', 'receivedOn', 'text'], [], where);
    checkText(item.id, `${where} id`, 100);
    if (typeof item.receivedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.receivedOn)
      || Number.isNaN(Date.parse(item.receivedOn))) {
      refuse(`${where} has a damaged date.`);
    }
    checkText(item.text, `${where} text`);
  });
  checkUniqueIds(study.feedback, 'feedback responses');

  // Files exported before D28 have no `changedAt`: the file is the study as it
  // was at export, so nothing has changed since then.
  return 'changedAt' in study ? study : { ...study, changedAt: study.lastExportedAt ?? study.createdAt };
}

// D7: "Keep both" imports the study as a separate copy with a new id.
export function importAsCopy(study, env = defaultEnv) {
  return { ...study, id: env.newId(), name: `${study.name.slice(0, 193)} (copy)` };
}

// D12 + D28: may `imported` be saved into a browser that holds `studies`?
// `replacing` is true for "Replace existing". Returns { ok } or { ok: false, message }.
export function canImport(imported, studies, { replacing = false } = {}) {
  const existing = studies.find((s) => s.id === imported.id);
  if (replacing && existing && activeSession(existing)) {
    return { ok: false, message: 'End the running session before replacing this study.' };
  }
  const others = replacing ? studies.filter((s) => s.id !== imported.id) : studies;
  const running = findActiveSession(others);
  if (activeSession(imported) && running) {
    return {
      ok: false,
      message: `This backup has a running session, and a session is running in "${running.study.name}" `
        + `(round ${running.study.round}). End that session first.`,
    };
  }
  return { ok: true };
}
