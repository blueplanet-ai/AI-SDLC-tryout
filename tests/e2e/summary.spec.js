// FR5 + FR6: the Summary screen — summary text, name check, copy and download.
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

// Runs one session in the Live log and logs [screen, type, note] findings.
async function runSession(page, findings) {
  await page.goto('/app/#/live');
  await page.getByRole('button', { name: 'Start session' }).click();
  for (const [screen, type, note] of findings) {
    await page.locator('.chip', { hasText: screen }).click();
    await page.getByRole('button', { name: TYPE_BUTTON[type], exact: true }).click();
    await page.locator('#note').fill(note);
    await page.locator('#note').press('Enter');
    await expect(page.locator('#note')).toHaveValue('');
  }
  await page.getByRole('button', { name: 'End session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End', exact: true }).click();
  await expect(page.getByLabel('Participant ID')).toBeVisible();
}

async function sampleData(page) {
  await createStudy(page, 'SAMPLE summary study', ['Home', 'Menu', 'Help']);
  await runSession(page, [
    ['Menu', 'positive', 'SAMPLE likes the icons'],
    ['Home', 'pain', 'SAMPLE slow login'],
  ]);
  await runSession(page, [
    ['Home', 'pain', 'SAMPLE cannot find back'],
    ['Menu', 'pain', 'SAMPLE menu <b>too</b> deep'],
  ]);
}

async function openSummary(page) {
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Summary', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Summary');
}

const summaryText = (page) => page.locator('#summary-text');

test('FR5: without an open study, Summary links to Studies', async ({ page }) => {
  await page.goto('/app/#/summary');
  await expect(page.locator('[data-body="summary"]')).toContainText('No study is open.');
  await expect(page.getByRole('link', { name: 'Go to Studies' })).toBeVisible();
});

test('FR5: the summary shows header, screens by breadth of pain, and the feedback request', async ({ page }) => {
  await sampleData(page);
  await openSummary(page);
  const text = await summaryText(page).textContent();
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  expect(text).toContain('# Test summary: SAMPLE summary study\n');
  expect(text).toContain('- Prototype type: Figma click-through\n');
  expect(text).toContain(`- Dates: ${today}\n`);
  expect(text).toContain('- Participants: 2\n');
  // Home: 2 participants with a pain point; Menu: 1. Help has no findings.
  expect(text.indexOf('## Home')).toBeLessThan(text.indexOf('## Menu'));
  expect(text).toContain('## No findings\n\n- Help\n');
  // Pain points first, then positive moments, each with its participant ID.
  expect(text).toContain('### Pain points\n\n- P2: SAMPLE menu <b>too</b> deep\n\n### Positive moments\n\n- P1: SAMPLE likes the icons\n');
  expect(text.trimEnd().endsWith(
    "## Feedback\n\nReply to this message with one thing that was useful and one thing you'll act on.")).toBe(true);
  // Notes are shown as plain text, never run as page code.
  await expect(summaryText(page).locator('b')).toHaveCount(0);
});

test('FR6: Copy and Download stay disabled until the name check is ticked (C2, D26)', async ({ page }) => {
  await sampleData(page);
  await openSummary(page);
  const copy = page.getByRole('button', { name: 'Copy summary' });
  const download = page.getByRole('button', { name: 'Download summary' });
  const check = page.getByLabel('I checked for names and personal details');

  await expect(check).not.toBeChecked();
  await expect(copy).toBeDisabled();
  await expect(download).toBeDisabled();

  await check.check();
  await expect(copy).toBeEnabled();
  await expect(download).toBeEnabled();

  await check.uncheck();
  await expect(copy).toBeDisabled();
  await expect(download).toBeDisabled();

  // The tick is not remembered: coming back asks again.
  await check.check();
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review');
  await openSummary(page);
  await expect(check).not.toBeChecked();
  await expect(copy).toBeDisabled();
});

test('FR6: copied text and downloaded file are identical to the summary shown', async ({ page }) => {
  await sampleData(page);
  await openSummary(page);
  const shown = await summaryText(page).textContent();

  await page.getByLabel('I checked for names and personal details').check();
  await page.getByRole('button', { name: 'Copy summary' }).click();
  await expect(page.locator('#status')).toHaveText('Summary copied. Paste it into an email, chat or document.');
  const copied = await page.evaluate(() => navigator.clipboard.readText());

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download summary' }).click();
  const file = await downloadPromise;
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  expect(file.suggestedFilename()).toBe(`SAMPLE summary study - round 1 - summary - ${today}.md`);
  const downloaded = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'));
  await expect(page.locator('#status')).toHaveText(`Summary saved as "SAMPLE summary study - round 1 - summary - ${today}.md".`);

  expect(copied).toBe(downloaded);
  expect(downloaded).toBe(shown);
});

test('FR6: the name check, Copy and Download work with the keyboard only', async ({ page }) => {
  await sampleData(page);
  await openSummary(page);
  await page.getByLabel('I checked for names and personal details').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Copy summary' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toHaveText(/Summary copied/);
});
