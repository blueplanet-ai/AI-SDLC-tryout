import { test, assertEqual } from './runner.js';
import { shortcutFor } from '../../app/js/keyboard.js';

// A key press as the browser reports it; only the fields the rules read.
function key(code, { key = '', alt = false, shift = false, ctrl = false, meta = false, composing = false, keyCode = 0 } = {}) {
  return { code, key, altKey: alt, shiftKey: shift, ctrlKey: ctrl, metaKey: meta, isComposing: composing, keyCode };
}

test('FR3: Alt+1…9 pick screens 1 to 9', () => {
  for (let n = 1; n <= 9; n++) {
    assertEqual(shortcutFor(key(`Digit${n}`, { alt: true })), { action: 'screen', index: n - 1 });
  }
});

test('FR3: Alt+number is read by key position, so Mac Option+1 ("¡") still works', () => {
  assertEqual(shortcutFor(key('Digit1', { key: '¡', alt: true })), { action: 'screen', index: 0 });
  assertEqual(shortcutFor(key('KeyT', { key: '†', alt: true })), { action: 'toggle-type' });
});

test('FR3: Alt+0 is not a shortcut', () => {
  assertEqual(shortcutFor(key('Digit0', { alt: true })), null);
});

test('FR3: plain digits are text, not shortcuts', () => {
  assertEqual(shortcutFor(key('Digit3', { key: '3' })), null);
});

test('FR3: Alt+T toggles the type', () => {
  assertEqual(shortcutFor(key('KeyT', { alt: true })), { action: 'toggle-type' });
});

test('FR3: Alt+S jumps to screen search (D2)', () => {
  assertEqual(shortcutFor(key('KeyS', { alt: true })), { action: 'search' });
});

test('FR3: Alt with Shift, Ctrl or Cmd is left to the browser', () => {
  assertEqual(shortcutFor(key('Digit1', { alt: true, shift: true })), null);
  assertEqual(shortcutFor(key('KeyT', { alt: true, ctrl: true })), null);
  assertEqual(shortcutFor(key('KeyS', { alt: true, meta: true })), null);
});

test('FR3: Enter saves', () => {
  assertEqual(shortcutFor(key('Enter', { key: 'Enter' })), { action: 'save' });
});

test('FR3: Shift+Enter is a new line, not save (D3)', () => {
  assertEqual(shortcutFor(key('Enter', { key: 'Enter', shift: true })), null);
});

test('FR3: Enter while composing Korean/Japanese/Chinese does not save', () => {
  assertEqual(shortcutFor(key('Enter', { key: 'Enter', composing: true })), null);
  assertEqual(shortcutFor(key('Enter', { key: 'Process', keyCode: 229 })), null);
});
