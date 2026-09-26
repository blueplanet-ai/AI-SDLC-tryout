// Step 10 (spec 4.3, D29): the app works offline after one visit, says so
// while offline, and offers a new version without ever reloading by itself.
// Most tests run their own small web server, so they can stop it (no
// internet) and publish a "new version" the way the publish workflow does.
// All data here is SAMPLE data.
import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = fileURLToPath(new URL('../../app/', import.meta.url));
const VERSION_LINE = "const CACHE_VERSION = 'dev';";
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
};

let pageErrors;
let server;
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
});
test.afterEach(async () => {
  await server?.stop();
  server = undefined;
  expect(pageErrors).toEqual([]);
});

// Serves app/ like GitHub Pages (which lets browsers reuse files for 10
// minutes). With a version, sw.js gets it the way the publish workflow sets
// it; without one it stays 'dev', as in local testing.
async function startServer(version) {
  let current = version;
  const http = createServer(async (req, res) => {
    let file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (file.endsWith('/')) file += 'index.html';
    const full = path.join(APP_DIR, file);
    try {
      if (!full.startsWith(APP_DIR)) throw new Error('outside app/');
      let body = await readFile(full);
      if (file === '/sw.js' && current) {
        body = body.toString().replace(VERSION_LINE, `const CACHE_VERSION = '${current}';`);
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(full)] ?? 'application/octet-stream',
        'Cache-Control': 'max-age=600',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${http.address().port}/`,
    publish(newVersion) { current = newVersion; },
    async stop() {
      if (!http.listening) return;
      http.closeAllConnections();
      await new Promise((resolve) => http.close(resolve));
    },
  };
}

// Waits until the offline copy is saved and looks after this page.
async function offlineCopyReady(page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

async function createStudy(page, url, name = 'SAMPLE offline study') {
  await page.goto(`${url}#/studies`);
  await page.getByLabel('Study name').fill(name);
  await page.getByLabel('Prototype type').selectOption({ label: 'Figma click-through' });
  await page.getByRole('button', { name: 'Create study' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
  await page.getByLabel('New screen name').fill('Home');
  await page.getByLabel('New screen name').press('Enter');
  await expect(page.locator('.screen-list li').last()).toContainText('Home');
}

async function startSession(page, url) {
  await page.goto(`${url}#/live`);
  await expect(page.getByLabel('Participant ID')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#note')).toBeFocused();
}

// Every file in app/, as addresses relative to the app ("js/main.js").
async function appFiles(dir = APP_DIR) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await appFiles(full));
    else files.push(path.relative(APP_DIR, full).split(path.sep).join('/'));
  }
  return files;
}

for (const { mode, version } of [
  { mode: 'published app', version: 'v1' },
  { mode: 'local testing', version: undefined },
]) {
  test(`Offline (spec 4.3): after one visit the ${mode} opens and logs a finding with no internet`, async ({ page, context }) => {
    server = await startServer(version);
    await createStudy(page, server.url);
    await offlineCopyReady(page);

    // Wi-Fi off: the browser is offline and the web server is gone.
    await context.setOffline(true);
    await server.stop();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study setup');
    await expect(page.getByText('Offline — your work is saved on this laptop')).toBeVisible();

    await startSession(page, server.url);
    await page.keyboard.type('SAMPLE logged offline');
    await page.keyboard.press('Enter');
    await expect(page.locator('.feed-list li').first()).toContainText('SAMPLE logged offline');
  });
}

test('D29: the offline note shows only while the laptop is offline', async ({ page, context }) => {
  await page.goto('/app/');
  const note = page.getByText('Offline — your work is saved on this laptop');
  await expect(note).toBeHidden();
  await context.setOffline(true);
  await expect(note).toBeVisible();
  await context.setOffline(false);
  await expect(note).toBeHidden();
});

test('D29: a new version shows a banner, never reloads by itself, and Reload during a session keeps it', async ({ page }) => {
  server = await startServer('v1');
  await createStudy(page, server.url);
  await offlineCopyReady(page);
  // Another site on the same github.io address keeps its own saved copy.
  await page.evaluate(async () => { await caches.open('another-site'); });

  await startSession(page, server.url);
  await page.keyboard.type('SAMPLE half-typed note');
  await page.evaluate(() => { window.sameVisit = true; });

  server.publish('v2');
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
  const banner = page.locator('#update-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText('New version available — Reload');

  // Nothing happens until the note-taker presses Reload; typing goes on.
  await expect(page.locator('#note')).toBeFocused();
  await page.keyboard.type(' continued');
  expect(await page.evaluate(() => window.sameVisit)).toBe(true);
  expect(await page.evaluate(() => caches.keys())).toContain('tsn-app-v1');

  const reloaded = page.waitForEvent('load');
  await banner.getByRole('button', { name: 'Reload' }).click();
  await reloaded;

  expect(await page.evaluate(() => window.sameVisit)).toBeUndefined();
  await expect(banner).toBeHidden();
  // The session is still running and the half-typed note is back.
  await expect(page.locator('#note')).toHaveValue('SAMPLE half-typed note continued');
  // The old copy is removed; the other site's copy is left alone.
  await expect.poll(async () => (await page.evaluate(() => caches.keys())).sort())
    .toEqual(['another-site', 'tsn-app-v2']);
});

test('D29: the first visit shows no "New version" banner', async ({ page }) => {
  server = await startServer('v1');
  await page.goto(server.url);
  await offlineCopyReady(page);
  await page.reload();
  await offlineCopyReady(page);
  await expect(page.locator('#update-banner')).toBeHidden();
});

test('Offline (spec 4.3): every app file is kept for offline use', async ({ page }) => {
  server = await startServer('v1');
  await page.goto(server.url);
  await offlineCopyReady(page);
  const saved = await page.evaluate(async () => {
    const cache = await caches.open('tsn-app-v1');
    return (await cache.keys()).map((request) => new URL(request.url).pathname.slice(1));
  });
  const expected = (await appFiles()).filter((file) => file !== 'sw.js');
  expect(saved.sort()).toEqual(['', ...expected].sort());
});

test('D29: sw.js has exactly one version line for the publish workflow to set', async () => {
  const text = await readFile(path.join(APP_DIR, 'sw.js'), 'utf8');
  expect(text.split('\n').filter((line) => line === VERSION_LINE)).toHaveLength(1);
});
