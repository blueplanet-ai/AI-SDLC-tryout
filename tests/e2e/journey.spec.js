// Definition of done: one note-taker runs scenarios S1 to S5 end to end, with
// the keyboard only (not just during live logging), while every request the
// browser makes is recorded — none may go to another website (privacy, spec 5).
// All data here is SAMPLE data.
import { test, expect } from '@playwright/test';

// Lets the robot read back what "Copy summary" put on the clipboard.
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

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

// Presses Tab (or Shift+Tab) until `target` has focus, like a keyboard user
// moving through the page. Fails if it cannot be reached.
async function tabTo(page, target, key = 'Tab') {
  for (let i = 0; i < 60; i += 1) {
    if (await target.evaluate((node) => node === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`Could not reach ${target} with ${key}`);
}

// Opens a screen from the menu with the keyboard. The menu sits above the
// screen, so it is reached with Shift+Tab.
async function goTo(page, screen) {
  await tabTo(page, page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: screen, exact: true }), 'Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(screen);
}

async function logNote(page, text) {
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await expect(page.locator('.feed-list li').first()).toContainText(text);
}

// Ends the running session through its dialog: Cancel has focus, "End" is just before it.
async function endSession(page, nextId) {
  await tabTo(page, page.getByRole('button', { name: 'End session' }), 'Shift+Tab');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await tabTo(page, dialog.getByRole('button', { name: 'End', exact: true }), 'Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('Participant ID')).toBeFocused();
  await expect(page.getByLabel('Participant ID')).toHaveValue(nextId);
}

async function readDownload(download) {
  return (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'));
}

test('DoD: S1–S5 end to end with the keyboard only, and no request leaves the app', async ({ page, context, baseURL }) => {
  // Privacy: every request of the page and of its offline copy (service worker).
  const ownOrigin = new URL(baseURL).origin;
  const outside = [];
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (!['blob:', 'data:'].includes(url.protocol) && url.origin !== ownOrigin) outside.push(request.url());
  });

  // ----- S1: create a study with its screens -----
  await tabTo(page, page.getByLabel('Study name'));
  await page.keyboard.type('SAMPLE journey study');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Prototype type')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('Prototype type')).toHaveValue('figma');
  await tabTo(page, page.getByRole('button', { name: 'Create study' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');

  await tabTo(page, page.getByLabel('New screen name'));
  for (const screen of ['Home', 'Menu', 'Settings']) {
    await page.keyboard.type(screen);
    await page.keyboard.press('Enter');
    await expect(page.locator('.screen-list li').last()).toContainText(screen);
    await expect(page.getByLabel('New screen name')).toBeFocused();
  }

  // ----- S2: start a session for P1 -----
  await tabTo(page, page.getByRole('button', { name: 'Start session' }));
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Participant ID')).toBeFocused();
  await expect(page.getByLabel('Participant ID')).toHaveValue('P1');
  await page.keyboard.press('Enter');
  await expect(page.locator('#note')).toBeFocused();

  // ----- S3: log findings fast -----
  await logNote(page, 'SAMPLE could not find the 3 buttons');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'SAMPLE liked the colours');
  await page.keyboard.press('Alt+Digit2');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'SAMPLE menu too deeep');
  await page.keyboard.press('Alt+Digit3');
  await logNote(page, 'SAMPLE toggle unclear');
  await endSession(page, 'P2');

  // S2 + S3 again for P2 (the suggested ID).
  await page.keyboard.press('Enter');
  await expect(page.locator('#current-participant')).toHaveText('P2');
  await expect(page.locator('#note')).toBeFocused();
  await page.keyboard.press('Alt+Digit2');
  await logNote(page, 'SAMPLE menu labels confusing');
  await page.keyboard.press('Alt+Digit1');
  await logNote(page, 'SAMPLE logged by mistake');
  await endSession(page, 'P3');

  // ----- S4: review and clean up (newest finding first, D25) -----
  await goTo(page, 'Review');
  await tabTo(page, page.getByRole('button', { name: 'Delete finding: SAMPLE logged by mistake' }));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('dialog').getByRole('button', { name: 'Delete finding' }), 'Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#findings-count')).toHaveText('5 findings.');

  await tabTo(page, page.getByRole('button', { name: 'Edit finding: SAMPLE menu too deeep' }));
  await page.keyboard.press('Enter');
  await expect(page.locator('#edit-note')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('SAMPLE menu too deep');
  await page.keyboard.press('Enter');
  await expect(page.locator('td.note-cell', { hasText: 'SAMPLE menu too deep' })).toHaveCount(1);

  // ...then generate and share the summary.
  await goTo(page, 'Summary');
  const shown = await page.locator('#summary-text').textContent();
  expect(shown).toContain('SAMPLE menu too deep');
  expect(shown).not.toContain('SAMPLE logged by mistake');
  await tabTo(page, page.getByLabel('I checked for names and personal details'));
  await page.keyboard.press('Space');
  await tabTo(page, page.getByRole('button', { name: 'Copy summary' }));
  await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toHaveText(/Summary copied/);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  await tabTo(page, page.getByRole('button', { name: 'Download summary' }));
  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  const downloaded = await readDownload(await downloadPromise);
  expect(copied).toBe(shown);
  expect(downloaded).toBe(shown);

  // ----- S5: log the feedback readers sent back -----
  await tabTo(page, page.getByLabel('Feedback', { exact: true }));
  for (const [reply, status] of [
    ['SAMPLE reply: the menu section was useful', '1 of 2 — below target'],
    ['SAMPLE reply: we will fix the toggle', '2 of 2 — target met'],
  ]) {
    await page.keyboard.type(reply);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Add feedback' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#feedback-status')).toHaveText(status);
    await expect(page.getByLabel('Feedback', { exact: true })).toBeFocused();
  }

  await goTo(page, 'Studies');
  const row = page.locator('.studies-table tbody tr', { hasText: 'SAMPLE journey study' });
  await expect(row.locator('td.feedback-cell')).toHaveText('2 of 2 — target met');

  expect(outside).toEqual([]);
});
