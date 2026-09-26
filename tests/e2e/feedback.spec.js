// FR8: the Feedback received panel on the Summary screen, and the per-round
// feedback count on the Studies list (D27). All data here is SAMPLE data.
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

async function createStudy(page, name) {
  await page.goto('/app/#/studies');
  await page.getByLabel('Study name').fill(name);
  await page.getByLabel('Prototype type').selectOption({ label: 'Figma click-through' });
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
}

async function openSummary(page) {
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Summary', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Summary');
}

// A date as YYYY-MM-DD in the laptop's time zone, `offset` days from today.
function dayFromToday(page, offset = 0) {
  return page.evaluate((days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, offset);
}

async function addFeedback(page, text, date) {
  if (date) await page.getByLabel('Date received').fill(date);
  await page.getByLabel('Feedback', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Add feedback' }).click();
  await expect(page.getByLabel('Feedback', { exact: true })).toHaveValue('');
}

const status = (page) => page.locator('#feedback-status');
const studyRow = (page, round) => page.locator('.studies-table tbody tr').filter({
  has: page.locator('td').first().filter({ hasText: new RegExp(`^${round}$`) }),
});

test('FR8: 1 response shows "below target", a 2nd shows "target met"', async ({ page }) => {
  await createStudy(page, 'SAMPLE feedback study');
  await openSummary(page);
  await expect(page.getByRole('heading', { name: 'Feedback received' })).toBeVisible();
  await expect(status(page)).toHaveText('0 of 2 — below target');

  await addFeedback(page, 'SAMPLE the ranking by screen was useful');
  await expect(status(page)).toHaveText('1 of 2 — below target');

  await addFeedback(page, 'SAMPLE we will fix the login first');
  await expect(status(page)).toHaveText('2 of 2 — target met');

  // Kept after a reload: the count comes from the logged feedback.
  await page.reload();
  await expect(status(page)).toHaveText('2 of 2 — target met');
  await expect(page.locator('#feedback-list li')).toHaveCount(2);
});

test('FR8: date received defaults to today; future dates are rejected (D27)', async ({ page }) => {
  await createStudy(page, 'SAMPLE feedback study');
  await openSummary(page);
  const today = await dayFromToday(page);
  await expect(page.getByLabel('Date received')).toHaveValue(today);

  const tomorrow = await dayFromToday(page, 1);
  await page.getByLabel('Date received').fill(tomorrow);
  await page.getByLabel('Feedback', { exact: true }).fill('SAMPLE from the future');
  await page.getByRole('button', { name: 'Add feedback' }).click();
  await expect(page.locator('#feedback-error')).toHaveText('The date received cannot be in the future.');
  await expect(status(page)).toHaveText('0 of 2 — below target');
  // The typed text is kept so it can be fixed.
  await expect(page.getByLabel('Feedback', { exact: true })).toHaveValue('SAMPLE from the future');

  const earlier = await dayFromToday(page, -3);
  await page.getByLabel('Date received').fill(earlier);
  await page.getByRole('button', { name: 'Add feedback' }).click();
  await expect(status(page)).toHaveText('1 of 2 — below target');
  await expect(page.locator('#feedback-list li').first()).toContainText(`Received ${earlier}`);
});

test('FR8: the feedback box shows the no-names reminder and empty feedback is refused', async ({ page }) => {
  await createStudy(page, 'SAMPLE feedback study');
  await openSummary(page);
  await expect(page.locator('#feedback-reminder'))
    .toHaveText('Paste the content only — no names, email addresses or signatures.');
  await page.getByRole('button', { name: 'Add feedback' }).click();
  await expect(page.locator('#feedback-error')).toHaveText('Feedback cannot be empty.');
});

test('FR8: feedback is deleted only after confirming, and cannot be edited (D16, D27)', async ({ page }) => {
  await createStudy(page, 'SAMPLE feedback study');
  await openSummary(page);
  await addFeedback(page, 'SAMPLE one <b>bold</b>');
  await addFeedback(page, 'SAMPLE two');
  await expect(status(page)).toHaveText('2 of 2 — target met');

  const items = page.locator('#feedback-list li');
  // Newest first; text is shown as typed, never run as page code.
  await expect(items.first()).toContainText('SAMPLE two');
  await expect(items.nth(1)).toContainText('SAMPLE one <b>bold</b>');
  await expect(items.locator('b')).toHaveCount(0);
  // No edit button: fix a mistake by deleting and adding again.
  await expect(items.getByRole('button', { name: /edit/i })).toHaveCount(0);

  // Cancel keeps it.
  await items.first().getByRole('button', { name: /^Delete feedback/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this feedback?' });
  await expect(dialog).toContainText('SAMPLE two');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(items).toHaveCount(2);

  // Confirm deletes it, and the status goes back below target.
  await items.first().getByRole('button', { name: /^Delete feedback/ }).click();
  await dialog.getByRole('button', { name: 'Delete feedback' }).click();
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('SAMPLE one');
  await expect(status(page)).toHaveText('1 of 2 — below target');
});

test('FR8: adding feedback keeps the name-check tick of the summary', async ({ page }) => {
  await createStudy(page, 'SAMPLE feedback study');
  await openSummary(page);
  await page.getByLabel('I checked for names and personal details').check();
  await addFeedback(page, 'SAMPLE useful');
  await expect(page.getByLabel('I checked for names and personal details')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Copy summary' })).toBeEnabled();
});

test('FR8: the Studies list shows each round\'s feedback count against the target (D27)', async ({ page }) => {
  await createStudy(page, 'SAMPLE rounds study');
  await openSummary(page);
  await addFeedback(page, 'SAMPLE round 1 reply A');
  await addFeedback(page, 'SAMPLE round 1 reply B');

  // Round 2 starts with no feedback (D1).
  await page.goto('/app/#/studies');
  await page.getByRole('button', { name: 'Copy SAMPLE rounds study, round 1, for next round' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
  await openSummary(page);
  await addFeedback(page, 'SAMPLE round 2 reply A');

  await page.goto('/app/#/studies');
  await expect(page.getByRole('columnheader', { name: 'Feedback' })).toBeVisible();
  await expect(studyRow(page, 1)).toContainText('Feedback: 2 of 2 — target met');
  await expect(studyRow(page, 2)).toContainText('Feedback: 1 of 2 — below target');
});

test('FR8: the feedback panel works with the keyboard only', async ({ page }) => {
  await createStudy(page, 'SAMPLE feedback study');
  await openSummary(page);
  await page.getByLabel('Feedback', { exact: true }).focus();
  await page.keyboard.type('SAMPLE line one');
  // Enter adds a new line in pasted feedback; the button adds it.
  await page.keyboard.press('Enter');
  await page.keyboard.type('SAMPLE line two');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Add feedback' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('1 of 2 — below target');
  await expect(page.locator('#feedback-list li .feed-note')).toHaveText('SAMPLE line one\nSAMPLE line two');
});
