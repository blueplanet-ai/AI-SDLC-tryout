// FR4: the Review screen — all findings in a table, filters, edit and delete.
// All data here is SAMPLE data.
import { test, expect } from '@playwright/test';

let pageErrors;
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.goto('/app/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

async function createStudy(page, name = 'SAMPLE review study', screens = ['Home', 'Menu', 'Settings']) {
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

// Runs one session in the Live log and logs [screen, type, note] findings.
async function runSession(page, findings, { end = true } = {}) {
  await page.goto('/app/#/live');
  await page.getByRole('button', { name: 'Start session' }).click();
  for (const [screen, type, note] of findings) {
    await page.locator('.chip', { hasText: screen }).click();
    await page.getByRole('button', { name: TYPE_BUTTON[type], exact: true }).click();
    await page.locator('#note').fill(note);
    await page.locator('#note').press('Enter');
    await expect(page.locator('#note')).toHaveValue('');
  }
  if (end) {
    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'End', exact: true }).click();
    await expect(page.getByLabel('Participant ID')).toBeVisible();
  }
}

// Two sessions, five findings.
async function sampleData(page) {
  await createStudy(page);
  await runSession(page, [
    ['Home', 'pain', 'SAMPLE slow login'],
    ['Menu', 'positive', 'SAMPLE likes the icons'],
  ]);
  await runSession(page, [
    ['Home', 'pain', 'SAMPLE cannot find back'],
    ['Settings', 'pain', 'SAMPLE toggle unclear'],
    ['Home', 'positive', 'SAMPLE quick start'],
  ]);
}

async function openReview(page) {
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review');
}

const rows = (page) => page.locator('#findings-table tbody tr');
const noteCells = (page) => page.locator('#findings-table tbody td.note-cell');
const row = (page, note) => rows(page).filter({ hasText: note });

async function savedStudy(page) {
  const study = await page.evaluate(() => Object.keys(localStorage)
    .filter((k) => k.startsWith('tsn:study:'))
    .map((k) => JSON.parse(localStorage.getItem(k)).data)[0]);
  const readable = study.findings.map((f) => ({
    participant: study.sessions.find((s) => s.id === f.sessionId).participantId,
    screen: study.screens.find((s) => s.id === f.screenId).name,
    type: f.type,
    note: f.note,
  }));
  return { ...study, readable };
}

// ---------- The table ----------

test('FR4: without an open study, Review links to Studies', async ({ page }) => {
  await page.goto('/app/#/review');
  await expect(page.locator('[data-body="review"]')).toContainText('No study is open.');
  await expect(page.locator('[data-body="review"]').getByRole('link', { name: 'Go to Studies' })).toBeVisible();
});

test('FR4: a study without findings says so and shows no filters', async ({ page }) => {
  await createStudy(page);
  await openReview(page);
  await expect(page.locator('[data-body="review"]')).toContainText('No findings logged yet in this study.');
  await expect(page.locator('#filter-participant')).toHaveCount(0);
});

test('FR4: all findings are listed with participant, screen, type and note', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await expect(page.locator('#findings-count')).toHaveText('5 findings.');
  await expect(page.locator('#findings-table thead th'))
    .toHaveText(['Time', 'Participant', 'Screen', 'Type', 'Note', 'Actions']);
  await expect(row(page, 'SAMPLE toggle unclear').locator('td'))
    .toHaveText([/\d/, 'P2', 'Settings', 'Pain point', 'SAMPLE toggle unclear', 'EditDelete']);
});

test('FR4: findings are listed newest first (D25)', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await expect(noteCells(page)).toHaveText([
    'SAMPLE quick start', 'SAMPLE toggle unclear', 'SAMPLE cannot find back',
    'SAMPLE likes the icons', 'SAMPLE slow login',
  ]);
  // A finding logged later appears at the top.
  await runSession(page, [['Menu', 'pain', 'SAMPLE newest one']], { end: false });
  await openReview(page);
  await expect(noteCells(page).first()).toHaveText('SAMPLE newest one');
  await expect(noteCells(page).last()).toHaveText('SAMPLE slow login');
});

test('FR4: notes are shown as plain text, never run as code', async ({ page }) => {
  await createStudy(page);
  await runSession(page, [['Home', 'pain', 'SAMPLE <img src=x onerror=alert(1)> & <b>bold</b>']]);
  await openReview(page);
  await expect(noteCells(page)).toHaveText(['SAMPLE <img src=x onerror=alert(1)> & <b>bold</b>']);
  await expect(page.locator('#findings-table img, #findings-table b')).toHaveCount(0);
});

// ---------- Filters ----------

test('FR4: filter by participant', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await expect(page.locator('#filter-participant option')).toHaveText(['All', 'P1', 'P2']);
  await page.getByLabel('Participant', { exact: true }).selectOption('P1');
  await expect(noteCells(page)).toHaveText(['SAMPLE likes the icons', 'SAMPLE slow login']);
  await expect(page.locator('#findings-count')).toHaveText('Showing 2 of 5 findings.');
});

test('FR4: filter by screen', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await expect(page.locator('#filter-screen option')).toHaveText(['All', 'Home', 'Menu', 'Settings']);
  await page.getByLabel('Screen', { exact: true }).selectOption({ label: 'Home' });
  await expect(noteCells(page)).toHaveText(['SAMPLE quick start', 'SAMPLE cannot find back', 'SAMPLE slow login']);
});

test('FR4: filter by type', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await page.getByLabel('Type', { exact: true }).selectOption({ label: 'Positive moment' });
  await expect(noteCells(page)).toHaveText(['SAMPLE quick start', 'SAMPLE likes the icons']);
});

test('FR4: filters combine, and Clear filters shows everything again', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  await page.getByLabel('Participant', { exact: true }).selectOption('P2');
  await page.getByLabel('Screen', { exact: true }).selectOption({ label: 'Home' });
  await page.getByLabel('Type', { exact: true }).selectOption({ label: 'Pain point' });
  await expect(noteCells(page)).toHaveText(['SAMPLE cannot find back']);
  await expect(page.locator('#findings-count')).toHaveText('Showing 1 of 5 findings.');

  await page.getByLabel('Screen', { exact: true }).selectOption({ label: 'Menu' });
  await expect(page.locator('[data-body="review"]')).toContainText('No findings match these filters.');
  await expect(rows(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(rows(page)).toHaveCount(5);
  await expect(page.getByLabel('Participant', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Participant', { exact: true })).toBeFocused();
});

// ---------- Edit ----------

test('FR4: edit a finding\'s screen, type and note after the session ended; it stays after reload', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await row(page, 'SAMPLE slow login').getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('#edit-note')).toBeFocused();
  await page.locator('#edit-screen').selectOption({ label: 'Menu' });
  await page.locator('#edit-type').selectOption({ label: 'Positive moment' });
  await page.locator('#edit-note').fill('SAMPLE fast login');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.locator('#status')).toHaveText('Finding saved.');
  await expect(row(page, 'SAMPLE fast login').locator('td').nth(2)).toHaveText('Menu');
  await expect(row(page, 'SAMPLE fast login').locator('td').nth(3)).toHaveText('Positive moment');
  await expect(row(page, 'SAMPLE fast login').getByRole('button', { name: 'Edit' })).toBeFocused();

  await page.reload();
  await expect(row(page, 'SAMPLE fast login')).toHaveCount(1);
  expect((await savedStudy(page)).readable[0])
    .toEqual({ participant: 'P1', screen: 'Menu', type: 'positive', note: 'SAMPLE fast login' });
});

test('FR4: edit with the keyboard only — Enter saves, Shift+Enter adds a line, Escape cancels', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  const edit = row(page, 'SAMPLE quick start').getByRole('button', { name: 'Edit' });
  await edit.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#edit-note')).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('second line');
  await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toHaveText('Finding saved.');
  expect((await savedStudy(page)).readable[4].note).toBe('SAMPLE quick start\nsecond line');

  await row(page, 'SAMPLE slow login').getByRole('button', { name: 'Edit' }).click();
  await page.keyboard.type(' not saved');
  await page.keyboard.press('Escape');
  await expect(page.locator('#edit-note')).toHaveCount(0);
  await expect(row(page, 'SAMPLE slow login').getByRole('button', { name: 'Edit' })).toBeFocused();
  expect((await savedStudy(page)).readable[0].note).toBe('SAMPLE slow login');
});

test('FR4: an empty note cannot be saved from Review', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await row(page, 'SAMPLE slow login').getByRole('button', { name: 'Edit' }).click();
  await page.locator('#edit-note').fill('   ');
  await page.locator('#edit-note').press('Enter');
  await expect(page.locator('#review-error')).toHaveText('Note cannot be empty.');
  await expect(page.locator('#edit-note')).toBeVisible();
  expect((await savedStudy(page)).readable[0].note).toBe('SAMPLE slow login');
});

test('FR4: an edited finding that no longer matches the filters is hidden, with a message', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await page.getByLabel('Type', { exact: true }).selectOption({ label: 'Pain point' });
  await expect(rows(page)).toHaveCount(3);
  await row(page, 'SAMPLE slow login').getByRole('button', { name: 'Edit' }).click();
  await page.locator('#edit-type').selectOption({ label: 'Positive moment' });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(page.locator('#status')).toHaveText('Finding saved. It no longer matches the filters, so it is hidden.');
  await expect(page.locator('#findings-count')).toHaveText('Showing 2 of 5 findings.');
});

test('FR4: findings can be edited in Review during a running session', async ({ page }) => {
  await createStudy(page);
  await runSession(page, [['Home', 'pain', 'SAMPLE typo hre']], { end: false });
  await openReview(page);
  await row(page, 'SAMPLE typo hre').getByRole('button', { name: 'Edit' }).click();
  await page.locator('#edit-screen').selectOption({ label: 'Settings' });
  await page.locator('#edit-note').fill('SAMPLE typo here');
  await page.locator('#edit-note').press('Enter');
  await page.goto('/app/#/live');
  await expect(page.locator('#current-participant')).toHaveText('P1');
  await expect(page.locator('.feed-list li').first()).toContainText('SAMPLE typo here');
  await expect(page.locator('.feed-list li').first()).toContainText('Settings');
});

// ---------- Delete ----------

test('FR4: delete asks for confirmation; Cancel and Escape keep the finding (D16)', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  const del = row(page, 'SAMPLE likes the icons').getByRole('button', { name: 'Delete' });
  await del.click();
  const dialog = page.getByRole('dialog', { name: 'Delete this finding?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('SAMPLE likes the icons');
  await expect(dialog).toContainText('A deleted finding cannot be recovered.');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(del).toBeFocused();

  await del.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(rows(page)).toHaveCount(5);
  expect((await savedStudy(page)).findings).toHaveLength(5);
});

test('FR4: confirming delete removes the finding for good (D16)', async ({ page }) => {
  await sampleData(page);
  await openReview(page);
  await row(page, 'SAMPLE likes the icons').getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete finding' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#status')).toHaveText('Finding deleted.');
  await expect(page.locator('#findings-count')).toHaveText('4 findings.');
  await expect(row(page, 'SAMPLE likes the icons')).toHaveCount(0);

  await page.reload();
  await expect(rows(page)).toHaveCount(4);
  expect((await savedStudy(page)).readable.map((f) => f.note)).toEqual([
    'SAMPLE slow login', 'SAMPLE cannot find back', 'SAMPLE toggle unclear', 'SAMPLE quick start',
  ]);
});
