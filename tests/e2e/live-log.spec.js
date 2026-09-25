// FR2 + FR3: starting sessions and live logging, driven like a user would.
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

async function createStudy(page, name = 'SAMPLE study', screens = ['Home', 'Menu', 'Settings']) {
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

// Opens the Live log and starts a session with the keyboard only.
async function startSession(page, participant) {
  await page.goto('/app/#/live');
  const input = page.getByLabel('Participant ID');
  await expect(input).toBeFocused();
  if (participant !== undefined) await input.fill(participant);
  await page.keyboard.press('Enter');
  await expect(page.locator('#note')).toBeFocused();
}

async function logNote(page, text) {
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

// The saved study as stored in the browser, with findings in readable form.
async function savedStudy(page, name) {
  const study = await page.evaluate((studyName) => Object.keys(localStorage)
    .filter((k) => k.startsWith('tsn:study:'))
    .map((k) => JSON.parse(localStorage.getItem(k)).data)
    .find((s) => studyName === undefined || s.name === studyName), name);
  const readable = study.findings.map((f) => ({
    participant: study.sessions.find((s) => s.id === f.sessionId).participantId,
    screen: study.screens.find((s) => s.id === f.screenId).name,
    type: f.type,
    note: f.note,
  }));
  return { ...study, readable };
}

// Ends the running session through the confirmation dialog, without a backup.
async function endSessionNow(page) {
  await page.getByRole('button', { name: 'End session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End', exact: true }).click();
  await expect(page.getByLabel('Participant ID')).toBeFocused();
}

const chip = (page, name) => page.locator('.chip', { hasText: name });
const feedItems = (page) => page.locator('.feed-list li');

// ---------- FR2: sessions and participants ----------

test('FR2: Start session in Setup opens the Live log with P1 suggested', async ({ page }) => {
  await createStudy(page);
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Live log');
  await expect(page.getByLabel('Participant ID')).toHaveValue('P1');
  await expect(page.getByLabel('Participant ID')).toBeFocused();
});

test('FR2: the second session pre-fills P2', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await expect(page.locator('#current-participant')).toHaveText('P1');
  await endSessionNow(page);
  await expect(page.getByLabel('Participant ID')).toHaveValue('P2');
  await page.getByLabel('Participant ID').press('Enter');
  await expect(page.locator('#current-participant')).toHaveText('P2');
});

for (const bad of ['Anna', 'P0', 'P03', '1', 'P 1', 'P1a', '']) {
  test(`FR2: '${bad}' is rejected with an inline message and no session starts`, async ({ page }) => {
    await createStudy(page);
    await page.goto('/app/#/live');
    await page.getByLabel('Participant ID').fill(bad);
    await page.getByLabel('Participant ID').press('Enter');
    await expect(page.locator('#participant-error'))
      .toHaveText('Use P followed by a number, like P1 or P12. No names or other details.');
    await expect(page.locator('#note')).toHaveCount(0);
    expect((await savedStudy(page)).sessions).toEqual([]);
  });
}

test('FR2: p3 is accepted and stored as P3', async ({ page }) => {
  await createStudy(page);
  await startSession(page, 'p3');
  await expect(page.locator('#current-participant')).toHaveText('P3');
  expect((await savedStudy(page)).sessions.map((s) => s.participantId)).toEqual(['P3']);
});

test('FR2: a participant ID used before shows a warning but can still start (D5)', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await endSessionNow(page);
  await expect(page.locator('#participant-warning')).toBeHidden();
  await page.getByLabel('Participant ID').fill('p1');
  await expect(page.locator('#participant-warning')).toHaveText('P1 was already used in this study. You can still start.');
  await page.getByLabel('Participant ID').press('Enter');
  await expect(page.locator('#current-participant')).toHaveText('P1');
  expect((await savedStudy(page)).sessions.map((s) => s.participantId)).toEqual(['P1', 'P1']);
});

test('FR1: the Live log cannot start a session in a study without screens', async ({ page }) => {
  await createStudy(page, 'SAMPLE empty', []);
  await page.goto('/app/#/live');
  await expect(page.locator('#start-blocked')).toContainText('Add at least one screen before starting a session.');
  await expect(page.getByRole('button', { name: 'Start session' })).toBeDisabled();
});

test('FR2: End session asks for confirmation; Cancel and Escape keep the session running (D24)', async ({ page }) => {
  await createStudy(page);
  await startSession(page, 'P7');
  await page.getByRole('button', { name: 'End session' }).click();
  const dialog = page.getByRole('dialog', { name: 'End session for P7?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button')).toHaveText(['End and export backup', 'End', 'Cancel']);
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'End session' })).toBeFocused();
  // Escape also cancels.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#current-participant')).toHaveText('P7');
  expect((await savedStudy(page)).sessions[0].endedAt).toBeNull();
});

test('FR2: shortcuts do nothing while the End session dialog is open (D24)', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.getByRole('button', { name: 'End session' }).click();
  await page.keyboard.press('Alt+Digit2');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(chip(page, 'Home')).toHaveAttribute('aria-pressed', 'true');
});

test('FR2: "End" records the end time without a backup (D13, D24)', async ({ page }) => {
  await createStudy(page, 'SAMPLE end');
  await startSession(page);
  await logNote(page, 'One finding');
  await endSessionNow(page);
  await expect(page.locator('#status')).toHaveText('Session P1 ended.');
  const study = await savedStudy(page);
  expect(typeof study.sessions[0].endedAt).toBe('string');
  expect(study.lastExportedAt).toBeNull();
});

test('FR2: "End and export backup" ends the session and saves a backup that includes the end (D17, D24)', async ({ page }) => {
  await createStudy(page, 'SAMPLE end');
  await startSession(page);
  await logNote(page, 'One finding');
  await page.getByRole('button', { name: 'End session' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: 'End and export backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('SAMPLE-end-round-1.study.json');
  const file = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8')));
  expect(typeof file.study.sessions[0].endedAt).toBe('string');
  expect(file.study.findings).toHaveLength(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#status'))
    .toHaveText('Session P1 ended. Backup saved as SAMPLE-end-round-1.study.json in your Downloads folder.');
  await expect(page.getByLabel('Participant ID')).toHaveValue('P2');
  const study = await savedStudy(page);
  expect(typeof study.sessions[0].endedAt).toBe('string');
  expect(typeof study.lastExportedAt).toBe('string');
});

// ---------- FR3: live logging ----------

test('FR3: 10 findings in a row with the keyboard only, across 3 screens and both types', async ({ page }) => {
  await createStudy(page, 'SAMPLE keyboard run');
  await startSession(page); // keyboard only from here on
  const note = page.locator('#note');

  await logNote(page, 'Could not find the 3 buttons');
  await logNote(page, 'Tapped back 2x');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'Liked the colours');
  await page.keyboard.press('Alt+Digit2');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'Label <Settings> unclear & 100% "confusing"');
  // Shift+Enter adds a new line instead of saving (D3).
  await page.keyboard.type('Line one');
  await page.keyboard.press('Shift+Enter');
  await logNote(page, 'line two');
  // Enter while Korean is still being composed must not save.
  await page.keyboard.insertText('메뉴가 어려움');
  await note.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true });
  await expect(feedItems(page)).toHaveCount(5);
  await expect(note).toHaveValue('메뉴가 어려움');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Alt+Digit3');
  await logNote(page, 'Toggle 5 worked?');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'Fast search 10/10');
  await page.keyboard.press('Alt+Digit1');
  await logNote(page, 'Back on home after 30 s');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'Error 404 page');

  await expect(note).toBeFocused();
  await expect(note).toHaveValue('');
  const { readable } = await savedStudy(page);
  expect(readable).toEqual([
    { participant: 'P1', screen: 'Home', type: 'pain', note: 'Could not find the 3 buttons' },
    { participant: 'P1', screen: 'Home', type: 'pain', note: 'Tapped back 2x' },
    { participant: 'P1', screen: 'Home', type: 'positive', note: 'Liked the colours' },
    { participant: 'P1', screen: 'Menu', type: 'pain', note: 'Label <Settings> unclear & 100% "confusing"' },
    { participant: 'P1', screen: 'Menu', type: 'pain', note: 'Line one\nline two' },
    { participant: 'P1', screen: 'Menu', type: 'pain', note: '메뉴가 어려움' },
    { participant: 'P1', screen: 'Settings', type: 'pain', note: 'Toggle 5 worked?' },
    { participant: 'P1', screen: 'Settings', type: 'positive', note: 'Fast search 10/10' },
    { participant: 'P1', screen: 'Home', type: 'positive', note: 'Back on home after 30 s' },
    { participant: 'P1', screen: 'Home', type: 'pain', note: 'Error 404 page' },
  ]);
  const study = await savedStudy(page);
  expect(study.findings.every((f) => typeof f.time === 'string' && f.time !== '')).toBe(true);
});

test('FR3: after Enter the note box is focused and empty; screen and type stay selected', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.keyboard.press('Alt+Digit2');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'Nice menu');
  const note = page.locator('#note');
  await expect(note).toBeFocused();
  await expect(note).toHaveValue('');
  await expect(chip(page, 'Menu')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'Home')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Positive moment' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#current-selection')).toHaveText('Menu · Positive moment');
});

test('FR3: Alt+number does not type a character into the note', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.keyboard.type('Draft');
  await page.keyboard.press('Alt+Digit3');
  await page.keyboard.press('Alt+KeyT');
  await expect(page.locator('#note')).toHaveValue('Draft');
  await expect(chip(page, 'Settings')).toHaveAttribute('aria-pressed', 'true');
});

test('FR3: Alt+9 with only 3 screens says there is no screen 9', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.keyboard.press('Alt+Digit9');
  await expect(page.locator('#status')).toHaveText('There is no screen 9.');
  await expect(chip(page, 'Home')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#note')).toBeFocused();
});

test('FR3: an empty note is not saved and shows a message', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('#note-error')).toHaveText('Note cannot be empty.');
  expect((await savedStudy(page)).findings).toEqual([]);
});

test('FR3: a saved finding appears in the recent feed within 1 second', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await logNote(page, 'Speed check');
  // Generous limit (D20): catches a real slowdown without failing on slow test machines.
  await expect(feedItems(page).first()).toContainText('Speed check', { timeout: 1000 });
});

test('FR3: the recent feed shows the newest first, with participant, screen and type', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await logNote(page, 'First');
  await page.keyboard.press('Alt+Digit2');
  await page.keyboard.press('Alt+KeyT');
  await logNote(page, 'Second');
  await expect(feedItems(page)).toHaveCount(2);
  await expect(feedItems(page).first()).toContainText('Second');
  await expect(feedItems(page).first()).toContainText('Positive moment P1 · Menu');
  await expect(feedItems(page).nth(1)).toContainText('Pain point P1 · Home');
});

test('FR3: a typo in the most recent finding can be fixed from the feed, keyboard only', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await logNote(page, 'Older note');
  await logNote(page, 'Tpyo in note');
  await page.keyboard.press('Tab'); // Save finding button
  await page.keyboard.press('Tab'); // Edit on the newest finding
  await expect(page.getByRole('button', { name: 'Edit note: Tpyo in note' })).toBeFocused();
  await page.keyboard.press('Enter');
  const editBox = page.getByLabel('Fix note');
  await expect(editBox).toBeFocused();
  await editBox.fill('Typo in note');
  await page.keyboard.press('Enter');
  await expect(feedItems(page).first()).toContainText('Typo in note');
  await expect(page.locator('#note')).toBeFocused();
  const { readable } = await savedStudy(page);
  expect(readable.map((f) => f.note)).toEqual(['Older note', 'Typo in note']);
});

test('FR3: Escape cancels a feed edit without changing the note', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await logNote(page, 'Keep me');
  await page.getByRole('button', { name: 'Edit note: Keep me' }).click();
  await page.getByLabel('Fix note').fill('Changed');
  await page.keyboard.press('Escape');
  await expect(feedItems(page).first()).toContainText('Keep me');
  expect((await savedStudy(page)).readable[0].note).toBe('Keep me');
});

test('FR1: typing a new screen name in the live log adds it to the study', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.keyboard.press('Alt+KeyS');
  await expect(page.getByLabel('Find or add a screen')).toBeFocused();
  await page.keyboard.type('Checkout');
  await page.keyboard.press('Enter');
  await expect(page.locator('#note')).toBeFocused();
  await expect(chip(page, 'Checkout')).toHaveAttribute('aria-pressed', 'true');
  await logNote(page, 'Pay button hidden');
  expect((await savedStudy(page)).readable.at(-1)).toMatchObject({ screen: 'Checkout', note: 'Pay button hidden' });
  await page.getByRole('link', { name: 'Study setup', exact: true }).click();
  await expect(page.locator('.screen-list .screen-name')).toHaveText(['1. Home', '2. Menu', '3. Settings', '4. Checkout']);
});

test('FR3: Alt+S picks an existing screen, also beyond the first nine (D2)', async ({ page }) => {
  const screens = Array.from({ length: 11 }, (_, i) => `Screen ${i + 1}`);
  await createStudy(page, 'SAMPLE many screens', screens);
  await startSession(page);
  await page.keyboard.press('Alt+KeyS');
  await page.keyboard.type('screen 11');
  await page.keyboard.press('Enter');
  await expect(chip(page, 'Screen 11')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#status')).toHaveText('Screen "Screen 11" selected.');
  await logNote(page, 'Deep screen note');
  const study = await savedStudy(page);
  expect(study.screens).toHaveLength(11);
  expect(study.readable[0].screen).toBe('Screen 11');
});

test('FR3: Escape in the screen search goes back to the note box', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.keyboard.press('Alt+KeyS');
  await page.keyboard.type('Some');
  await page.keyboard.press('Escape');
  await expect(page.locator('#note')).toBeFocused();
  expect((await savedStudy(page)).screens).toHaveLength(3);
});

test('FR3: notes are shown as plain text, never run as code', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await logNote(page, '<img src=x onerror="window.hacked=1">');
  await expect(page.locator('.feed-note').first()).toHaveText('<img src=x onerror="window.hacked=1">');
  expect(await page.evaluate(() => window.hacked)).toBeUndefined();
});

// ---------- D12: one running session, resumed after reopening ----------

test('FR3: a running session and the unsaved note survive a reload (D12)', async ({ page }) => {
  await createStudy(page);
  await startSession(page, 'P4');
  await logNote(page, 'Saved one');
  await page.keyboard.press('Alt+Digit2');
  await page.keyboard.type('Half written');
  await page.reload();
  await expect(page.locator('#current-participant')).toHaveText('P4');
  await expect(page.locator('#note')).toHaveValue('Half written');
  await expect(page.locator('#note')).toBeFocused();
  await expect(chip(page, 'Menu')).toHaveAttribute('aria-pressed', 'true');
  await expect(feedItems(page)).toHaveCount(1);
  await page.keyboard.press('Enter');
  expect((await savedStudy(page)).readable.at(-1)).toMatchObject({ screen: 'Menu', note: 'Half written' });
});

test('FR2: the Studies screen links back to a running session (D12)', async ({ page }) => {
  await createStudy(page, 'SAMPLE resume');
  await startSession(page);
  await page.goto('/app/#/studies');
  await expect(page.locator('#running-session')).toContainText('Session P1 is running in "SAMPLE resume" (round 1).');
  await page.getByRole('link', { name: 'Continue in Live log' }).click();
  await expect(page.locator('#note')).toBeFocused();
});

test('FR2: only one session runs at a time, across studies (D12)', async ({ page }) => {
  await createStudy(page, 'SAMPLE first');
  await startSession(page);
  await createStudy(page, 'SAMPLE second', ['Home']);
  await expect(page.locator('#start-help'))
    .toHaveText('A session is running in "SAMPLE first" (round 1). End it first.');
  await expect(page.getByRole('button', { name: 'Start session' })).toBeDisabled();
  // The Live log shows the session that is running.
  await page.goto('/app/#/live');
  await expect(page.locator('.live-bar')).toContainText('SAMPLE first');
});

test('FR2: Setup offers to continue its running session instead of starting a new one', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  await page.getByRole('link', { name: 'Study setup', exact: true }).click();
  await expect(page.locator('#start-help')).toHaveText('Session P1 is running.');
  await page.getByRole('button', { name: 'Continue in Live log' }).click();
  await expect(page.locator('#note')).toBeFocused();
});

test('FR3: the session timer counts up', async ({ page }) => {
  await createStudy(page);
  await startSession(page);
  const timer = page.locator('#timer');
  await expect(timer).toHaveText(/^00:0\d$/);
  const first = await timer.textContent();
  await expect(timer).not.toHaveText(first, { timeout: 3000 });
});
