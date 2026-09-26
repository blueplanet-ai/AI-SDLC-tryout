// C3(d): asks the browser to keep this site's data "persistent", so it is not
// cleared on its own when the laptop runs low on space. Chrome and Edge decide
// silently; Firefox may ask the note-taker once. It is a request, not a
// guarantee, so export backups stay the real safety net.

// Resolves to 'kept', 'not-kept' or 'unsupported'. Never throws.
export async function askToKeepData() {
  const storage = globalThis.navigator?.storage;
  if (!storage || typeof storage.persist !== 'function') return 'unsupported';
  try {
    if (typeof storage.persisted === 'function' && await storage.persisted()) return 'kept';
    return (await storage.persist()) ? 'kept' : 'not-kept';
  } catch {
    return 'unsupported';
  }
}
