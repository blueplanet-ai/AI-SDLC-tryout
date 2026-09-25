// Tiny test runner: register tests with test(name, fn), then run() shows
// green/red results on the page. The robot tests read window.unitResults.

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assertEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`.trim());
}

export function assertThrows(fn, errorName, message = '') {
  try {
    fn();
  } catch (err) {
    if (errorName && err.name !== errorName) {
      throw new Error(`${message} expected ${errorName}, got ${err.name}: ${err.message}`.trim());
    }
    return err;
  }
  throw new Error(`${message} expected an error, none was thrown`.trim());
}

export async function run() {
  const list = document.getElementById('results');
  const results = [];
  for (const { name, fn } of tests) {
    const li = document.createElement('li');
    try {
      await fn();
      results.push({ name, ok: true });
      li.className = 'pass';
      li.textContent = `PASS  ${name}`;
    } catch (err) {
      results.push({ name, ok: false, error: String(err && err.message || err) });
      li.className = 'fail';
      li.textContent = `FAIL  ${name} — ${err && err.message || err}`;
    }
    list.append(li);
  }
  const failed = results.filter((r) => !r.ok).length;
  const status = document.getElementById('status');
  status.textContent = failed === 0
    ? `All ${results.length} tests passed`
    : `${failed} of ${results.length} tests failed`;
  status.className = failed === 0 ? 'pass' : 'fail';
  window.unitResults = results;
}
