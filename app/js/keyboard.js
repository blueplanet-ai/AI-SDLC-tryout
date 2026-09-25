// Live-log shortcuts (FR3, D2, D3). No screen code here: this only decides
// what a key press means; the Live log screen carries it out.
//
// Keys are read by physical position (event.code, e.g. "Digit1", "KeyT"),
// because on a Mac Option+1 types "¡" and Option+T types "†".

// Returns one of:
//   { action: 'screen', index }   Alt+1…9: pick screen number index+1
//   { action: 'toggle-type' }     Alt+T: pain point ↔ positive moment
//   { action: 'search' }          Alt+S: jump to the screen search box
//   { action: 'save' }            Enter (not Shift+Enter, not while composing)
//   null                          anything else, including Shift+Enter (new line)
export function shortcutFor(event) {
  const { code, altKey, ctrlKey, metaKey, shiftKey } = event;

  if (altKey && !ctrlKey && !metaKey && !shiftKey) {
    const digit = /^Digit([1-9])$/.exec(code);
    if (digit) return { action: 'screen', index: Number(digit[1]) - 1 };
    if (code === 'KeyT') return { action: 'toggle-type' };
    if (code === 'KeyS') return { action: 'search' };
    return null;
  }

  if (event.key === 'Enter' && !altKey && !ctrlKey && !metaKey && !shiftKey && !isComposing(event)) {
    return { action: 'save' };
  }
  return null;
}

// While Korean, Japanese or Chinese text is being composed, Enter confirms
// the characters and must not save. Some browsers only signal this with keyCode 229.
export function isComposing(event) {
  return event.isComposing === true || event.keyCode === 229;
}
