// FR7: export, import and the "Last exported" indicator (D7, D28), and the
// request to keep this site's data (plan section 4, C3 d). All data here is SAMPLE data.
import { readFile } from 'node:fs/promises';
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

async function createStudy(page, name, screens = ['Home', 'Menu']) {
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

async function goTo(page, screen) {
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: screen, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(screen);
}

async function startSession(page) {
  await page.goto('/app/#/live');
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.locator('#note')).toBeFocused();
}

async function logNote(page, text) {
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await expect(page.locator('.feed-list li').first()).toContainText(text.split('\n')[0]);
}

async function endSession(page) {
  await page.getByRole('button', { name: 'End session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End', exact: true }).click();
  await expect(page.getByLabel('Participant ID')).toBeFocused();
}

async function addFeedback(page, text) {
  await goTo(page, 'Summary');
  await page.getByLabel('Feedback', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Add feedback' }).click();
  await expect(page.getByLabel('Feedback', { exact: true })).toHaveValue('');
}

// Clicks "Export study" on the study's row; returns the download.
async function exportFromRow(page, name, round = 1) {
  await page.goto('/app/#/studies');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: `Export ${name}, round ${round}` }).click();
  return downloadPromise;
}

async function storedStudies(page) {
  return page.evaluate(() => Object.keys(localStorage)
    .filter((k) => k.startsWith('tsn:study:'))
    .map((k) => JSON.parse(localStorage.getItem(k)).data));
}

// Sets fields of the stored study directly, then reloads.
async function changeStored(page, fields) {
  await page.evaluate((values) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('tsn:study:'));
    const saved = JSON.parse(localStorage.getItem(key));
    Object.assign(saved.data, values);
    localStorage.setItem(key, JSON.stringify(saved));
  }, fields);
  await page.reload();
}

const rows = (page) => page.locator('.studies-table tbody tr');
const rowBackup = (page, name) => rows(page).filter({ has: page.locator('th', { hasText: name }) }).locator('.backup-status');
const indicator = (page) => page.locator('#backup-status');

async function importFile(page, file) {
  await page.goto('/app/#/studies');
  await page.getByLabel('Backup file (.study.json)').setInputFiles(file);
}

// ---------- Export ----------

test('FR7: "Export study" on a Studies row saves a backup file (D28)', async ({ page }) => {
  await createStudy(page, 'SAMPLE export');
  await page.goto('/app/#/studies');
  // The button sits next to Delete.
  await expect(rows(page).first().locator('.actions button'))
    .toHaveText(['Open', 'Copy for next round', 'Export study', 'Delete']);
  await expect(rowBackup(page, 'SAMPLE export')).toHaveText('Not backed up yet');

  const download = await exportFromRow(page, 'SAMPLE export');
  expect(download.suggestedFilename()).toBe('SAMPLE-export-round-1.study.json');
  const file = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8')));
  expect(file.schemaVersion).toBe(1);
  expect(file.study.screens.map((s) => s.name)).toEqual(['Home', 'Menu']);
  await expect(page.locator('#status'))
    .toHaveText('Backup saved as SAMPLE-export-round-1.study.json in your Downloads folder.');
  await expect(rowBackup(page, 'SAMPLE export')).toHaveText('Last exported: just now');
  await expect(page.getByRole('button', { name: 'Export SAMPLE export, round 1' })).toBeFocused();
});

// ---------- Export → clear → import (definition of done) ----------

test('FR7: export, clear browser data, import restores the study completely', async ({ page }) => {
  await createStudy(page, 'SAMPLE round trip', ['Home', 'Menu', 'Settings']);
  await startSession(page);
  await logNote(page, 'SAMPLE cannot find 2 buttons');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'SAMPLE likes the colours');
  await endSession(page);
  await addFeedback(page, 'SAMPLE useful summary\nwill fix the menu');

  const download = await exportFromRow(page, 'SAMPLE round trip');
  const before = await storedStudies(page);
  expect(before).toHaveLength(1);
  expect(before[0].findings).toHaveLength(2);
  expect(before[0].feedback).toHaveLength(1);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.empty')).toHaveText('No studies yet. Create one above.');

  await importFile(page, await download.path());
  await expect(page.locator('#status')).toHaveText('Study "SAMPLE round trip" (round 1) imported.');
  expect(await storedStudies(page)).toEqual(before);
  await expect(rowBackup(page, 'SAMPLE round trip')).toHaveText('Last exported: just now');
  await expect(rowBackup(page, 'SAMPLE round trip')).not.toHaveClass(/warn/);
  await expect(page.getByLabel('Backup file (.study.json)')).toBeFocused();
});

test('FR7: the SAMPLE fixture file can be imported', async ({ page }) => {
  await importFile(page, 'tests/fixtures/sample-study.study.json');
  await expect(page.locator('#status')).toHaveText('Study "SAMPLE — not real data: checkout test" (round 1) imported.');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator('td').nth(4)).toHaveText('4'); // findings
});

// ---------- Last exported indicator (D28) ----------

test('FR7: "Not backed up yet" turns amber once the study has findings (D28)', async ({ page }) => {
  await createStudy(page, 'SAMPLE never');
  await expect(indicator(page)).toHaveText('Not backed up yet');
  await expect(indicator(page)).not.toHaveClass(/warn/);
  await startSession(page);
  await logNote(page, 'SAMPLE first finding');
  await expect(page.locator('.live-bar #backup-status')).toHaveText('Not backed up yet');
  await expect(page.locator('.live-bar #backup-status')).toHaveClass(/warn/);
  await page.goto('/app/#/studies');
  await expect(rowBackup(page, 'SAMPLE never')).toHaveClass(/warn/);
});

test('FR7: "Last exported" is shown on every study screen and turns amber after any change (D28)', async ({ page }) => {
  await createStudy(page, 'SAMPLE indicator');
  await exportFromRow(page, 'SAMPLE indicator');
  await page.getByRole('button', { name: 'Open SAMPLE indicator, round 1' }).click();

  for (const screen of ['Study setup', 'Live log', 'Review', 'Summary']) {
    await goTo(page, screen);
    await expect(indicator(page), screen).toHaveText('Last exported: just now');
    await expect(indicator(page), screen).not.toHaveClass(/warn/);
  }

  // Feedback is a change too; the indicator on Summary updates at once.
  await page.getByLabel('Feedback', { exact: true }).fill('SAMPLE reply');
  await page.getByRole('button', { name: 'Add feedback' }).click();
  await expect(indicator(page)).toHaveText('Last exported: just now — changed since');
  await expect(indicator(page)).toHaveClass(/warn/);
  await page.goto('/app/#/studies');
  await expect(rowBackup(page, 'SAMPLE indicator')).toHaveText('Last exported: just now — changed since');

  // A new export clears the amber.
  await exportFromRow(page, 'SAMPLE indicator');
  await expect(rowBackup(page, 'SAMPLE indicator')).not.toHaveClass(/warn/);

  // A screen change (here: a rename) counts too.
  await goTo(page, 'Study setup');
  await page.getByRole('button', { name: 'Rename Home' }).click();
  await page.locator('#rename-input').fill('Start');
  await page.locator('#rename-input').press('Enter');
  await expect(indicator(page)).toHaveClass(/warn/);
});

test('FR7: exporting without changes, or saving unchanged details, keeps it green (D28)', async ({ page }) => {
  await createStudy(page, 'SAMPLE same');
  await exportFromRow(page, 'SAMPLE same');
  await page.getByRole('button', { name: 'Open SAMPLE same, round 1' }).click();
  await page.getByRole('button', { name: 'Save details' }).click();
  await expect(page.locator('#status')).toHaveText('Study details saved.');
  await expect(indicator(page)).not.toHaveClass(/warn/);
});

test('FR7: "Last exported" says how long ago (D28)', async ({ page }) => {
  await createStudy(page, 'SAMPLE old export');
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000 - 60000).toISOString();
  await changeStored(page, { lastExportedAt: threeDaysAgo, changedAt: threeDaysAgo });
  await expect(indicator(page)).toHaveText('Last exported: 3 days ago');
  await page.goto('/app/#/studies');
  await expect(rowBackup(page, 'SAMPLE old export')).toHaveText('Last exported: 3 days ago');
});

// ---------- Import of a study that is already here (D7) ----------

test('FR7: importing a study that is already here asks "Replace existing" or "Keep both" (D7)', async ({ page }) => {
  await createStudy(page, 'SAMPLE twice');
  const download = await exportFromRow(page, 'SAMPLE twice');
  const file = await download.path();
  // Change the study after the backup.
  await page.getByRole('button', { name: 'Open SAMPLE twice, round 1' }).click();
  await page.getByLabel('New screen name').fill('Added later');
  await page.getByLabel('New screen name').press('Enter');

  // Cancel changes nothing.
  await importFile(page, file);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading')).toHaveText('"SAMPLE twice" (round 1) is already here');
  await expect(dialog.getByRole('button')).toHaveText(['Replace existing', 'Keep both (import as copy)', 'Cancel']);
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(rows(page)).toHaveCount(1);

  // Keep both: a second row named "(copy)".
  await importFile(page, file);
  await dialog.getByRole('button', { name: 'Keep both (import as copy)' }).click();
  await expect(page.locator('#status')).toHaveText('Study "SAMPLE twice (copy)" (round 1) imported.');
  await expect(rows(page).locator('th')).toHaveText([/SAMPLE twice/, /SAMPLE twice/]);
  await expect(rows(page).locator('th', { hasText: 'SAMPLE twice (copy)' })).toHaveCount(1);

  // Replace: the original gets the backup's screens back and is no longer amber.
  await importFile(page, file);
  await dialog.getByRole('button', { name: 'Replace existing' }).click();
  await expect(page.locator('#status')).toHaveText('Study "SAMPLE twice" (round 1) replaced with the backup.');
  const studies = await storedStudies(page);
  expect(studies).toHaveLength(2);
  const original = studies.find((s) => s.name === 'SAMPLE twice');
  expect(original.screens.map((s) => s.name)).toEqual(['Home', 'Menu']);
  await expect(page.locator(`tr[data-study-id="${original.id}"] .backup-status`)).toHaveText('Last exported: just now');
  await expect(page.locator(`tr[data-study-id="${original.id}"] .backup-status`)).not.toHaveClass(/warn/);
});

test('FR7: "Replace existing" is blocked while that study has a running session (D28)', async ({ page }) => {
  await createStudy(page, 'SAMPLE busy');
  const download = await exportFromRow(page, 'SAMPLE busy');
  await page.getByRole('button', { name: 'Open SAMPLE busy, round 1' }).click();
  await startSession(page);
  await logNote(page, 'SAMPLE during the session');

  await importFile(page, await download.path());
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Replace existing' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('End the running session before replacing this study.');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  const [study] = await storedStudies(page);
  expect(study.findings).toHaveLength(1);
  expect(study.sessions[0].endedAt).toBeNull();
});

// ---------- Broken or foreign files ----------

test('FR7: a broken or foreign file is refused with a message and nothing is added', async ({ page }) => {
  await importFile(page, { name: 'notes.study.json', mimeType: 'application/json', buffer: Buffer.from('not json') });
  await expect(page.locator('#import-error'))
    .toHaveText('Could not import this file: it is not a study backup from this app.');

  const fixture = JSON.parse(await readFile('tests/fixtures/sample-study.study.json', 'utf8'));
  fixture.study.sessions[0].email = 'someone@example.com';
  await importFile(page, { name: 'x.study.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await expect(page.locator('#import-error'))
    .toHaveText('Could not import this file: Session 1 has an unknown field "email".');
  expect(await storedStudies(page)).toEqual([]);
});

// ---------- Keep this site's data (C3 d) ----------

test('FR7: the app asks the browser to keep its data once there is a study (C3 d)', async ({ page }) => {
  await page.addInitScript(() => {
    window.persistCalls = 0;
    Object.defineProperty(StorageManager.prototype, 'persisted', { value: async () => false });
    Object.defineProperty(StorageManager.prototype, 'persist', {
      value: async () => { window.persistCalls += 1; return true; },
    });
  });
  await page.reload();
  expect(await page.evaluate(() => window.persistCalls)).toBe(0);
  await expect(page.locator('#keep-data')).toHaveText('');

  await createStudy(page, 'SAMPLE keep');
  expect(await page.evaluate(() => window.persistCalls)).toBeGreaterThan(0);
  await goTo(page, 'Studies');
  await expect(page.locator('#keep-data'))
    .toHaveText('This browser has agreed to keep this app\'s data. Still export a backup after each session.');
});
