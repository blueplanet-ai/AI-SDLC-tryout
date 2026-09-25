// Checks the empty app shell: it loads, shows one screen at a time,
// and never contacts another website.
import { test, expect } from '@playwright/test';

const SCREENS = [
  { hash: '#/studies', heading: 'Studies' },
  { hash: '#/setup', heading: 'Study setup' },
  { hash: '#/live', heading: 'Live log' },
  { hash: '#/review', heading: 'Review' },
  { hash: '#/summary', heading: 'Summary' },
];

// Any script error on the page fails the test.
let pageErrors;
test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
});
test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

test('opens on the Studies screen with no errors', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto('/app/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studies');
  await expect(page.locator('[data-screen]:visible')).toHaveCount(1);
  expect(consoleErrors).toEqual([]);
});

test('each of the 5 screens can be reached from the menu, one at a time', async ({ page }) => {
  await page.goto('/app/');
  for (const { hash, heading } of SCREENS) {
    await page.getByRole('navigation', { name: 'Screens' })
      .getByRole('link', { name: heading, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(page.locator('[data-screen]:visible')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.getByRole('link', { name: heading, exact: true }))
      .toHaveAttribute('aria-current', 'page');
  }
});

test('reload keeps the current screen and Back returns to the previous one', async ({ page }) => {
  await page.goto('/app/#/review');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review');
  await page.getByRole('link', { name: 'Summary', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Summary');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review');
});

test('an unknown address shows the Studies screen', async ({ page }) => {
  await page.goto('/app/#/nope');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Studies');
});

test('makes no requests to other websites', async ({ page }) => {
  const outside = [];
  page.on('request', (req) => {
    if (new URL(req.url()).host !== '127.0.0.1:8000') outside.push(req.url());
  });
  await page.goto('/app/');
  for (const { heading } of SCREENS) {
    await page.getByRole('link', { name: heading, exact: true }).click();
  }
  expect(outside).toEqual([]);
});

test('page has a strict Content-Security-Policy', async ({ page }) => {
  await page.goto('/app/');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'none'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("connect-src 'none'");
  expect(csp).not.toContain('unsafe-inline');
  expect(csp).not.toContain('unsafe-eval');
});
