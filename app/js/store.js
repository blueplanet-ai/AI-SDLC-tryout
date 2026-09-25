// Saves and loads app data in the browser's storage (localStorage).
// No screen code here. Every key starts with "tsn:" because other
// *.github.io sites of the same account share this storage.
// Every stored value is wrapped as { schemaVersion, data } so a later
// version of the app can tell which format it is reading.

export const KEY_PREFIX = 'tsn:';
export const SCHEMA_VERSION = 1;

export class StoreError extends Error {
  constructor(message, key) {
    super(message);
    this.name = 'StoreError';
    this.key = key;
  }
}

// `backend` is anything with getItem/setItem/removeItem/key/length.
// Tests pass an in-memory copy instead of the real localStorage.
export function createStore(backend = globalThis.localStorage) {
  function fullKey(key) {
    if (typeof key !== 'string' || key === '') {
      throw new StoreError('Storage key must be a non-empty text', key);
    }
    return KEY_PREFIX + key;
  }

  // Returns the saved value, or undefined if nothing is saved under `key`.
  // Throws StoreError if the saved text is damaged or from an unknown
  // version, so callers never silently overwrite data they could not read.
  function load(key) {
    const raw = backend.getItem(fullKey(key));
    if (raw === null) return undefined;
    let wrapped;
    try {
      wrapped = JSON.parse(raw);
    } catch {
      throw new StoreError(`Saved data for "${key}" is damaged`, key);
    }
    if (!wrapped || typeof wrapped !== 'object' || !('data' in wrapped)) {
      throw new StoreError(`Saved data for "${key}" is damaged`, key);
    }
    if (wrapped.schemaVersion !== SCHEMA_VERSION) {
      throw new StoreError(
        `Saved data for "${key}" has unknown version ${wrapped.schemaVersion}`, key);
    }
    return wrapped.data;
  }

  // Throws StoreError if the browser refuses (for example, storage full).
  function save(key, data) {
    const k = fullKey(key);
    if (data === undefined) {
      throw new StoreError(`Cannot save nothing for "${key}"`, key);
    }
    const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION, data });
    try {
      backend.setItem(k, raw);
    } catch (err) {
      throw new StoreError(`Could not save "${key}": ${err.message}`, key);
    }
  }

  function remove(key) {
    backend.removeItem(fullKey(key));
  }

  // Keys saved by this app, without the "tsn:" prefix. Other sites' keys are ignored.
  function keys() {
    const result = [];
    for (let i = 0; i < backend.length; i++) {
      const k = backend.key(i);
      if (k !== null && k.startsWith(KEY_PREFIX)) result.push(k.slice(KEY_PREFIX.length));
    }
    return result.sort();
  }

  return { load, save, remove, keys };
}

// In-memory stand-in for localStorage, used by tests.
export function createMemoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}
