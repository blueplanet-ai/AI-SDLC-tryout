// Runs the unit-test page in the robot browser so unit tests also run on GitHub.
import { test, expect } from '@playwright/test';

test('unit tests all pass', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/tests/unit/');
  await page.waitForFunction(() => Array.isArray(window.unitResults), null, { timeout: 10_000 });
  const results = await page.evaluate(() => window.unitResults);
  expect(errors).toEqual([]);
  expect(results.length).toBeGreaterThan(0);
  expect(results.filter((r) => !r.ok)).toEqual([]);
});
