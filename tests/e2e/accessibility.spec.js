// Accessibility (spec 5, WCAG 2.1 AA): an automated scan (axe) of all five
// screens, with and without data, including the confirmation dialogs, the
// edit modes and the notes at the top of the page. All data here is SAMPLE data.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

// The scanner runs inside the page. It is given to the browser by the robot,
// so the app itself never loads it and its security rule stays strict.
const AXE_PATH = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
let axeSource;

// Only the WCAG 2.1 level A and AA rules: the level the spec asks for.
const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

let pageErrors;
let problems;
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  problems = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.goto('/app/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

// Scans the page as it is now; problems are collected, so one run lists all
// of them instead of stopping at the first screen with a problem.
async function scan(page, where) {
  axeSource ??= await readFile(AXE_PATH, 'utf8');
  if (!(await page.evaluate(() => typeof window.axe === 'object'))) await page.evaluate(axeSource);
  const violations = await page.evaluate((tags) => window.axe
    .run(document, { runOnly: { type: 'tag', values: tags } })
    .then((result) => result.violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      elements: v.nodes.map((n) => n.target.join(' ')),
      detail: v.nodes[0]?.failureSummary ?? '',
    }))), WCAG_21_AA);
  for (const v of violations) problems.push({ where, ...v });
}

function expectNoProblems() {
  expect(problems, `Accessibility problems:\n${JSON.stringify(problems, null, 2)}`).toEqual([]);
}

async function goTo(page, screen) {
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: screen, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(screen);
}

async function createStudy(page, name, screens) {
  await page.goto('/app/#/studies');
  await page.getByLabel('Study name').fill(name);
  await page.getByLabel('Prototype type').selectOption({ label: 'Figma click-through' });
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
  for (const screen of screens) {
    await page.getByLabel('New screen name').fill(screen);
    await page.getByLabel('New screen name').press('Enter');
    await expect(page.locator('.screen-list li').last()).toContainText(screen);
  }
}

const TYPE_BUTTON = { pain: 'Pain point', positive: 'Positive moment' };

async function logFindings(page, findings) {
  for (const [screen, type, note] of findings) {
    await page.locator('.chip', { hasText: screen }).click();
    await page.getByRole('button', { name: TYPE_BUTTON[type], exact: true }).click();
    await page.locator('#note').fill(note);
    await page.locator('#note').press('Enter');
    await expect(page.locator('#note')).toHaveValue('');
  }
}

async function endSession(page) {
  await page.getByRole('button', { name: 'End session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End', exact: true }).click();
  await expect(page.getByLabel('Participant ID')).toBeVisible();
}

async function closeDialog(page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('Accessibility (spec 5): every screen without a study passes the WCAG 2.1 AA scan', async ({ page }) => {
  await scan(page, 'Studies, no studies yet');
  for (const screen of ['Study setup', 'Live log', 'Review', 'Summary']) {
    await goTo(page, screen);
    await scan(page, `${screen}, no study open`);
  }
  expectNoProblems();
});

test('Accessibility (spec 5): all five screens with SAMPLE data pass the WCAG 2.1 AA scan', async ({ page }) => {
  await createStudy(page, 'SAMPLE accessibility study', ['Home', 'Menu', 'Settings']);
  await scan(page, 'Study setup');
  await page.getByRole('button', { name: 'Rename Menu' }).click();
  await scan(page, 'Study setup, renaming a screen');
  await page.keyboard.press('Escape');

  await goTo(page, 'Live log');
  await scan(page, 'Live log, start a session');
  await page.getByRole('button', { name: 'Start session' }).click();
  await logFindings(page, [
    ['Home', 'pain', 'SAMPLE slow login'],
    ['Menu', 'positive', 'SAMPLE likes the icons'],
  ]);
  await scan(page, 'Live log, session running');
  await page.locator('.feed-list li').first().getByRole('button', { name: /^Edit note/ }).click();
  await scan(page, 'Live log, fixing a note in the feed');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'End session' }).click();
  await scan(page, 'Live log, End session dialog');
  await closeDialog(page);
  await endSession(page);
  await page.getByLabel('Participant ID').fill('P1');
  await expect(page.locator('#participant-warning')).toBeVisible();
  await page.getByLabel('Participant ID').fill('Anna');
  await page.getByLabel('Participant ID').press('Enter');
  await expect(page.locator('#participant-error')).not.toBeEmpty();
  await scan(page, 'Live log, participant ID refused');

  await goTo(page, 'Review');
  await scan(page, 'Review');
  await page.getByLabel('Type').selectOption({ label: 'Pain point' });
  await scan(page, 'Review, filtered');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'Edit finding: SAMPLE slow login' }).click();
  await scan(page, 'Review, editing a finding');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Delete finding: SAMPLE slow login' }).click();
  await scan(page, 'Review, delete dialog');
  await closeDialog(page);

  await goTo(page, 'Summary');
  await page.getByLabel('Feedback', { exact: true }).fill('SAMPLE feedback reply');
  await page.getByRole('button', { name: 'Add feedback' }).click();
  await expect(page.locator('#feedback-list li')).toHaveCount(1);
  await scan(page, 'Summary, name check not ticked');
  await page.getByLabel('I checked for names and personal details').check();
  await scan(page, 'Summary, name check ticked');
  await page.locator('#feedback-list').getByRole('button', { name: /^Delete feedback/ }).click();
  await scan(page, 'Summary, delete feedback dialog');
  await closeDialog(page);

  await goTo(page, 'Studies');
  await expect(page.locator('#keep-data')).not.toBeEmpty();
  await scan(page, 'Studies, with a study');
  await page.getByRole('button', { name: 'Delete SAMPLE accessibility study, round 1' }).click();
  await scan(page, 'Studies, delete dialog');
  await closeDialog(page);

  expectNoProblems();
});

test('Accessibility (spec 5): the "New version" banner and the offline note pass the WCAG 2.1 AA scan', async ({ page }) => {
  await createStudy(page, 'SAMPLE accessibility study', ['Home']);
  await goTo(page, 'Live log');
  await page.getByRole('button', { name: 'Start session' }).click();
  // Shown by hand: a real new version is tested in offline.spec.js.
  await page.evaluate(() => {
    document.getElementById('update-banner').hidden = false;
    document.getElementById('offline-note').hidden = false;
  });
  await scan(page, 'Live log with the "New version" banner and the offline note');
  await goTo(page, 'Studies');
  await scan(page, 'Studies with the "New version" banner and the offline note');
  expectNoProblems();
});
