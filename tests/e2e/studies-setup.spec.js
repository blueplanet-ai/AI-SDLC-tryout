// FR1: Studies and Study setup screens, driven like a user would.
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

async function createStudy(page, name = 'SAMPLE study', type = 'Figma click-through') {
  await page.goto('/app/#/studies');
  await page.getByLabel('Study name').fill(name);
  await page.getByLabel('Prototype type').selectOption({ label: type });
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
}

async function addScreens(page, names) {
  for (const name of names) {
    await page.getByLabel('New screen name').fill(name);
    await page.getByLabel('New screen name').press('Enter');
    await expect(page.locator('.screen-list li').last()).toContainText(name);
  }
}

const screenNames = (page) => page.locator('.screen-list .screen-name');

test('FR1: creating a study opens its setup and lists it on Studies', async ({ page }) => {
  await createStudy(page, 'SAMPLE checkout test', 'In-vehicle / display');
  await expect(page.getByLabel('Study name')).toHaveValue('SAMPLE checkout test');
  await expect(page.getByLabel('Prototype type')).toHaveValue('in-vehicle');
  await page.getByRole('link', { name: 'Studies', exact: true }).click();
  const row = page.locator('.studies-table tbody tr');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('SAMPLE checkout test');
  await expect(row).toContainText('In-vehicle / display');
});

test('FR1: a study needs a name and a prototype type', async ({ page }) => {
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.locator('#new-study-error')).toHaveText('Study name cannot be empty.');
  await page.getByLabel('Study name').fill('SAMPLE');
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.locator('#new-study-error')).toHaveText('Choose a prototype type.');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studies');
});

test('FR1: Start session is disabled with an explanation until a screen is added', async ({ page }) => {
  await createStudy(page);
  const start = page.getByRole('button', { name: 'Start session' });
  await expect(start).toBeDisabled();
  await expect(page.locator('#start-help')).toHaveText('Add at least one screen before starting a session.');
  await addScreens(page, ['Home']);
  await expect(start).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start session' })).toBeEnabled();
});

test('FR1: removing the last screen disables Start session again', async ({ page }) => {
  await createStudy(page);
  await addScreens(page, ['Home']);
  await page.getByRole('button', { name: 'Remove Home' }).click();
  await expect(page.getByRole('button', { name: 'Start session' })).toBeDisabled();
});

test('FR1: add, rename, reorder and remove screens persist after reload', async ({ page }) => {
  await createStudy(page);
  await addScreens(page, ['Home', 'Menu', 'Settings', 'Checkout']);
  await expect(screenNames(page)).toHaveText(['1. Home', '2. Menu', '3. Settings', '4. Checkout']);

  await page.getByRole('button', { name: 'Rename Menu' }).click();
  await page.getByLabel('New name for screen 2').fill('Main menu');
  await page.getByRole('button', { name: 'Save name' }).click();

  await page.getByRole('button', { name: 'Move Settings up' }).click();
  await page.getByRole('button', { name: 'Move Home down' }).click();
  await page.getByRole('button', { name: 'Remove Checkout' }).click();

  const expected = ['1. Settings', '2. Home', '3. Main menu'];
  await expect(screenNames(page)).toHaveText(expected);
  await page.reload();
  await expect(screenNames(page)).toHaveText(expected);
});

test('FR1: a duplicate screen name shows an inline message', async ({ page }) => {
  await createStudy(page);
  await addScreens(page, ['Home']);
  await page.getByLabel('New screen name').fill('home');
  await page.getByLabel('New screen name').press('Enter');
  await expect(page.locator('#screens-error')).toHaveText('A screen called "Home" already exists.');
  await expect(screenNames(page)).toHaveCount(1);
});

test('FR1: Escape cancels a rename', async ({ page }) => {
  await createStudy(page);
  await addScreens(page, ['Home']);
  await page.getByRole('button', { name: 'Rename Home' }).click();
  await page.getByLabel('New name for screen 1').fill('Other');
  await page.getByLabel('New name for screen 1').press('Escape');
  await expect(screenNames(page)).toHaveText(['1. Home']);
  await expect(page.getByRole('button', { name: 'Rename Home' })).toBeFocused();
});

test('FR1: study name and type can be changed and persist', async ({ page }) => {
  await createStudy(page);
  await page.getByLabel('Study name').fill('SAMPLE renamed');
  await page.getByLabel('Prototype type').selectOption('other');
  await page.getByRole('button', { name: 'Save details' }).click();
  await expect(page.locator('#status')).toHaveText('Study details saved.');
  await page.reload();
  await expect(page.getByLabel('Study name')).toHaveValue('SAMPLE renamed');
  await expect(page.getByLabel('Prototype type')).toHaveValue('other');
});

test('FR1: copy for next round creates round 2 with the same screens', async ({ page }) => {
  await createStudy(page, 'SAMPLE rounds');
  await addScreens(page, ['Home', 'Menu']);
  await page.getByRole('link', { name: 'Studies', exact: true }).click();
  await page.getByRole('button', { name: 'Copy SAMPLE rounds, round 1, for next round' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
  await expect(page.locator('.context')).toHaveText('Round 2');
  await expect(screenNames(page)).toHaveText(['1. Home', '2. Menu']);
  await page.getByRole('link', { name: 'Studies', exact: true }).click();
  await expect(page.locator('.studies-table tbody tr')).toHaveCount(2);
});

test('FR1: Setup with no open study points to Studies', async ({ page }) => {
  await page.goto('/app/#/setup');
  await expect(page.getByRole('link', { name: 'Go to Studies' })).toBeVisible();
});

test('FR1: study and screens can be set up with the keyboard only', async ({ page }) => {
  await page.goto('/app/#/studies');
  await page.getByLabel('Study name').focus();
  await page.keyboard.type('SAMPLE keyboard');
  await page.keyboard.press('Tab');
  await page.keyboard.press('f'); // typing a letter picks the matching option
  await expect(page.getByLabel('Prototype type')).toHaveValue('figma');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create study' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
  await page.getByLabel('New screen name').focus();
  for (const name of ['Home', 'Menu']) {
    await page.keyboard.type(name);
    await page.keyboard.press('Enter');
  }
  await expect(screenNames(page)).toHaveText(['1. Home', '2. Menu']);
  await expect(page.getByLabel('New screen name')).toBeFocused();
});

test('FR1: names are shown as plain text, never run as code', async ({ page }) => {
  await createStudy(page, '<img src=x onerror="window.hacked=1">');
  await addScreens(page, ['<b>bold</b>']);
  await expect(screenNames(page)).toHaveText(['1. <b>bold</b>']);
  expect(await page.evaluate(() => window.hacked)).toBeUndefined();
});

test('FR7: studies are saved under tsn: keys with schemaVersion', async ({ page }) => {
  await createStudy(page);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every((k) => k.startsWith('tsn:'))).toBe(true);
  const raw = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('tsn:study:'));
    return JSON.parse(localStorage.getItem(key));
  });
  expect(raw.schemaVersion).toBe(1);
});

test('FR7: a damaged saved study shows a warning and the others still work', async ({ page }) => {
  await createStudy(page, 'SAMPLE fine');
  await page.evaluate(() => localStorage.setItem('tsn:study:broken', '{not json'));
  await page.getByRole('link', { name: 'Studies', exact: true }).click();
  await expect(page.locator('.warning')).toContainText('1 saved study could not be read');
  await expect(page.locator('.studies-table tbody tr')).toHaveCount(1);
});

// ---------- D23: delete study ----------

async function openDeleteDialog(page, name) {
  await page.getByRole('link', { name: 'Studies', exact: true }).click();
  await page.getByRole('button', { name: `Delete ${name}, round 1` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test('FR1: deleting a study asks for confirmation; Cancel keeps it (D23)', async ({ page }) => {
  await createStudy(page, 'SAMPLE keep');
  await addScreens(page, ['Home']);
  const dialog = await openDeleteDialog(page, 'SAMPLE keep');
  await expect(dialog).toContainText('Delete "SAMPLE keep" (round 1)?');
  await expect(dialog).toContainText('Deleted data cannot be recovered.');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete SAMPLE keep, round 1' })).toBeFocused();
  // Escape also cancels.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.studies-table tbody tr')).toHaveCount(1);
});

test('FR1: confirming delete removes the study permanently (D23)', async ({ page }) => {
  await createStudy(page, 'SAMPLE other');
  await createStudy(page, 'SAMPLE gone');
  const dialog = await openDeleteDialog(page, 'SAMPLE gone');
  await dialog.getByRole('button', { name: 'Delete study' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#status')).toHaveText('Study "SAMPLE gone" (round 1) deleted.');
  await page.reload();
  await expect(page.locator('.studies-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.studies-table')).not.toContainText('SAMPLE gone');
  // It was the open study, so Setup now has nothing open.
  await page.goto('/app/#/setup');
  await expect(page.getByRole('link', { name: 'Go to Studies' })).toBeVisible();
});

test('FR1: the delete dialog offers "Export a backup first" (D23)', async ({ page }) => {
  await createStudy(page, 'SAMPLE backup');
  await addScreens(page, ['Home', 'Menu']);
  const dialog = await openDeleteDialog(page, 'SAMPLE backup');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export a backup first' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('SAMPLE-backup-round-1.study.json');
  const file = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8')));
  expect(file.schemaVersion).toBe(1);
  expect(file.study.name).toBe('SAMPLE backup');
  expect(file.study.screens.map((s) => s.name)).toEqual(['Home', 'Menu']);
  await expect(dialog).toContainText('Backup saved as SAMPLE-backup-round-1.study.json');
  // The dialog stays open so the note-taker can still decide.
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.studies-table tbody tr')).toHaveCount(1);
});

test('FR1: a study with a running session cannot be deleted (D23)', async ({ page }) => {
  await createStudy(page, 'SAMPLE running');
  // Sessions are started in step 5; here one is put in storage directly.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('tsn:study:'));
    const saved = JSON.parse(localStorage.getItem(key));
    saved.data.sessions.push({ id: 's1', participantId: 'P1', startedAt: new Date().toISOString(), endedAt: null });
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.getByRole('link', { name: 'Studies', exact: true }).click();
  await page.getByRole('button', { name: 'Delete SAMPLE running, round 1' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'End the running session' }))
    .toHaveText('End the running session before deleting this study.');
  await page.reload();
  await expect(page.locator('.studies-table tbody tr')).toHaveCount(1);
});
