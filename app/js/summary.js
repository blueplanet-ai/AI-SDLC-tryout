// Builds the round summary (FR5) and turns it into Markdown text.
// Copy and Download both use toMarkdown(), so they are always identical (FR6).
// No screen code here.
//
// The Markdown uses only headings and bullet lists (D8), so it also reads
// cleanly when pasted into an email as plain text.

import { PROTOTYPE_TYPE_LABELS, participantOfFinding } from './model.js';

// D26: word for word, decided by the product owner.
export const FEEDBACK_REQUEST =
  'Reply to this message with one thing that was useful and one thing you\'ll act on.';

// A date as YYYY-MM-DD in the laptop's own time zone.
export function localDate(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const byTime = (a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0);

// The summary as plain data:
// { name, prototypeType, round, dateRange: { from, to } | null, participantCount,
//   screens: [{ name, painCount, positiveCount, painParticipantCount,
//               pain: [{ participantId, note }], positive: [...] }],
//   emptyScreens: [name] }
export function buildSummary(study) {
  const participantOf = (f) => participantOfFinding(study, f) ?? '?';

  // D14: earliest to latest session start date.
  const starts = study.sessions.map((s) => s.startedAt).sort();
  const dateRange = starts.length === 0 ? null
    : { from: localDate(starts[0]), to: localDate(starts[starts.length - 1]) };

  const sections = study.screens.map((screen, order) => {
    const findings = study.findings.filter((f) => f.screenId === screen.id).sort(byTime);
    // D26: pain points first, then positive moments; oldest first within each.
    const notes = (type) => findings.filter((f) => f.type === type)
      .map((f) => ({ participantId: participantOf(f), note: f.note }));
    const pain = notes('pain');
    const positive = notes('positive');
    return {
      order,
      name: screen.name,
      painCount: pain.length,
      positiveCount: positive.length,
      painParticipantCount: new Set(pain.map((n) => n.participantId)).size,
      pain,
      positive,
    };
  });

  // D15: participants with a pain point ↓, then pain points ↓, then screen-list order.
  const withFindings = sections
    .filter((s) => s.painCount + s.positiveCount > 0)
    .sort((a, b) => b.painParticipantCount - a.painParticipantCount
      || b.painCount - a.painCount
      || a.order - b.order)
    .map(({ order, ...rest }) => rest);

  return {
    name: study.name,
    prototypeType: PROTOTYPE_TYPE_LABELS[study.prototypeType] ?? study.prototypeType,
    round: study.round,
    dateRange,
    participantCount: new Set(study.sessions.map((s) => s.participantId)).size,
    screens: withFindings,
    // D6: screens without findings are listed last, so readers know they were tested.
    emptyScreens: sections.filter((s) => s.painCount + s.positiveCount === 0).map((s) => s.name),
  };
}

// A note may have several lines; indent the extra lines so they stay in the same bullet.
function noteBullet({ participantId, note }) {
  return `- ${participantId}: ${note.split(/\r?\n/).join('\n  ')}`;
}

// FR5 + FR6: the one and only summary text.
export function toMarkdown(study) {
  const s = buildSummary(study);
  const range = s.dateRange === null ? 'no sessions yet'
    : s.dateRange.from === s.dateRange.to ? s.dateRange.from
      : `${s.dateRange.from} to ${s.dateRange.to}`;

  const lines = [
    `# Test summary: ${s.name}`,
    '',
    `- Prototype type: ${s.prototypeType}`,
    `- Round: ${s.round}`,
    `- Dates: ${range}`,
    `- Participants: ${s.participantCount}`,
  ];

  for (const screen of s.screens) {
    lines.push('', `## ${screen.name}`, '',
      `- Pain points: ${screen.painCount}`,
      `- Positive moments: ${screen.positiveCount}`,
      `- Participants with a pain point: ${screen.painParticipantCount}`);
    if (screen.pain.length > 0) lines.push('', '### Pain points', '', ...screen.pain.map(noteBullet));
    if (screen.positive.length > 0) lines.push('', '### Positive moments', '', ...screen.positive.map(noteBullet));
  }

  if (s.emptyScreens.length > 0) {
    lines.push('', '## No findings', '', ...s.emptyScreens.map((name) => `- ${name}`));
  }

  lines.push('', '## Feedback', '', FEEDBACK_REQUEST, '');
  return lines.join('\n');
}

// D26: "<study name> - round <N> - summary - <YYYY-MM-DD>.md", dated the day it is downloaded.
// Characters that file systems refuse (/ \ : * ? " < > |) become "-".
export function summaryFileName(study, today = new Date()) {
  const name = study.name
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'study';
  return `${name} - round ${study.round} - summary - ${localDate(today)}.md`;
}
