import { test, assertEqual, assertThrows } from './runner.js';
import {
  createStore, createMemoryBackend, KEY_PREFIX, SCHEMA_VERSION,
} from '../../app/js/store.js';

function fresh() {
  const backend = createMemoryBackend();
  return { backend, store: createStore(backend) };
}

test('FR7: saved data can be loaded back unchanged', () => {
  const { store } = fresh();
  const study = { name: 'SAMPLE study', screens: ['Home', 'Menu'], count: 3 };
  store.save('study:1', study);
  assertEqual(store.load('study:1'), study);
});

test('FR7: loading a key that was never saved returns undefined', () => {
  const { store } = fresh();
  assertEqual(store.load('missing'), undefined);
});

test('FR7: keys are stored with the "tsn:" prefix', () => {
  const { store, backend } = fresh();
  store.save('study:1', { name: 'SAMPLE' });
  assertEqual(KEY_PREFIX, 'tsn:');
  assertEqual(backend.getItem('study:1'), null);
  assertEqual(backend.getItem('tsn:study:1') !== null, true);
});

test('FR7: stored data carries schemaVersion', () => {
  const { store, backend } = fresh();
  store.save('study:1', { name: 'SAMPLE' });
  const raw = JSON.parse(backend.getItem('tsn:study:1'));
  assertEqual(raw.schemaVersion, SCHEMA_VERSION);
  assertEqual(SCHEMA_VERSION, 1);
});

test('FR7: saving again replaces the old value', () => {
  const { store } = fresh();
  store.save('k', 1);
  store.save('k', 2);
  assertEqual(store.load('k'), 2);
});

test('FR7: remove deletes the saved value', () => {
  const { store } = fresh();
  store.save('k', 'SAMPLE');
  store.remove('k');
  assertEqual(store.load('k'), undefined);
});

test('FR7: keys() lists only this app\'s keys, without prefix', () => {
  const { store, backend } = fresh();
  backend.setItem('other-site:data', 'x');
  store.save('study:b', 1);
  store.save('study:a', 2);
  assertEqual(store.keys(), ['study:a', 'study:b']);
});

test('FR7: damaged saved text throws instead of returning wrong data', () => {
  const { store, backend } = fresh();
  backend.setItem('tsn:k', '{not json');
  assertThrows(() => store.load('k'), 'StoreError');
});

test('FR7: saved value without the version wrapper is rejected', () => {
  const { store, backend } = fresh();
  backend.setItem('tsn:k', JSON.stringify({ name: 'SAMPLE' }));
  assertThrows(() => store.load('k'), 'StoreError');
});

test('FR7: unknown schemaVersion is rejected', () => {
  const { store, backend } = fresh();
  backend.setItem('tsn:k', JSON.stringify({ schemaVersion: 99, data: 1 }));
  assertThrows(() => store.load('k'), 'StoreError');
});

test('FR7: storage full is reported as StoreError', () => {
  const backend = createMemoryBackend();
  backend.setItem = () => { throw new Error('QuotaExceededError'); };
  const store = createStore(backend);
  assertThrows(() => store.save('k', 1), 'StoreError');
});

test('FR7: empty key and undefined value are refused', () => {
  const { store } = fresh();
  assertThrows(() => store.save('', 1), 'StoreError');
  assertThrows(() => store.save('k', undefined), 'StoreError');
});
