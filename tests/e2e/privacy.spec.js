// Privacy (spec 5 and definition of done): no field asks for names or contact
// details, and the app's code never contacts another website. The requests
// made during a full S1–S5 run are checked in journey.spec.js.
// All data here is SAMPLE data.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

// Every field the app has, by its label. A new field fails this test until
// it has been reviewed and added here — like the allowed list of stored
// fields in the unit tests.
const ALLOWED_FIELDS = [
  'Backup file (.study.json)',
  'Date received',
  'Feedback',
  'Find or add a screen (Alt+S)',
  'Fix note',
  'I checked for names and personal details',
  'New name for screen 2',
  'New screen name',
  'Note',
  'Participant',
  'Participant ID',
  'Prototype type',
  'Screen',
  'Study name',
  'Type',
];

// Label, type and autofill hint of every field on the page now.
function fieldsOnPage(page) {
  return page.evaluate(() => [...document.querySelectorAll('input, select, textarea')].map((field) => {
    const byIds = (ids) => ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    const label = field.getAttribute('aria-label')
      ?? (field.getAttribute('aria-labelledby') ? byIds(field.getAttribute('aria-labelledby')) : null)
      ?? field.labels?.[0]?.textContent
      ?? '';
    return {
      label: label.replace(/\s+/g, ' ').trim(),
      type: field.getAttribute('type') ?? field.tagName.toLowerCase(),
      autocomplete: field.getAttribute('autocomplete') ?? '',
    };
  }));
}

async function goTo(page, screen) {
  await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: screen, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(screen);
}

test('Privacy (spec 5): no field on any screen asks for names, emails, ages, photos or contact details', async ({ page }) => {
  const seen = [];
  const collect = async () => seen.push(...await fieldsOnPage(page));

  await collect(); // Studies
  await page.getByLabel('Study name').fill('SAMPLE privacy study');
  await page.getByLabel('Prototype type').selectOption({ label: 'Figma click-through' });
  await page.getByRole('button', { name: 'Create study' }).click();
  for (const screen of ['Home', 'Menu']) {
    await page.getByLabel('New screen name').fill(screen);
    await page.getByLabel('New screen name').press('Enter');
  }
  await collect(); // Study setup
  await page.getByRole('button', { name: 'Rename Menu' }).click();
  await collect();
  await page.keyboard.press('Escape');

  await goTo(page, 'Live log');
  await collect(); // start a session
  await page.getByRole('button', { name: 'Start session' }).click();
  await page.locator('#note').fill('SAMPLE finding');
  await page.locator('#note').press('Enter');
  await collect(); // session running
  await page.getByRole('button', { name: /^Edit note/ }).click();
  await collect();
  await page.keyboard.press('Escape');

  await goTo(page, 'Review');
  await collect();
  await page.getByRole('button', { name: /^Edit finding/ }).click();
  await collect();
  await page.keyboard.press('Escape');

  await goTo(page, 'Summary');
  await collect();
  await goTo(page, 'Studies');
  await collect();

  expect([...new Set(seen.map((f) => f.label))].sort()).toEqual(ALLOWED_FIELDS);
  // No field asks the browser to fill in personal details either.
  for (const field of seen) {
    expect(['email', 'tel', 'url'], `field "${field.label}"`).not.toContain(field.type);
    expect(field.autocomplete, `field "${field.label}"`).not.toMatch(/name|email|tel|bday|photo|address|postal/);
  }
});

// Every file of the app, with its path inside app/.
async function appFiles(dir = 'app') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await appFiles(path));
    else files.push({ path, text: await readFile(path, 'utf8') });
  }
  return files;
}

test('Privacy (spec 5): the app code has no web addresses and no way to send data to a server', async () => {
  const files = await appFiles();
  expect(files.length).toBeGreaterThan(10);
  for (const { path, text } of files) {
    // The only address allowed is the SVG format name in the tab icon, which is never visited.
    const addresses = (text.match(/https?:\/\/[^\s'"`)>]+/g) ?? [])
      .filter((url) => !(path.endsWith('favicon.svg') && url === 'http://www.w3.org/2000/svg'));
    expect(addresses, path).toEqual([]);
    expect(text, path).not.toMatch(/XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|<iframe|<form[^>]+action=/);
    // Only the offline copy (sw.js) fetches, and only the app's own files.
    if (!path.endsWith('sw.js')) expect(text, path).not.toMatch(/\bfetch\(/);
  }
  const sw = files.find((f) => f.path.endsWith('sw.js')).text;
  expect(sw).toContain('request.url.startsWith(self.registration.scope)');
});
