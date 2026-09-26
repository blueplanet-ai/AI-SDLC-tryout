// Keeps studies in storage: one key per study ("tsn:study:<id>"), plus the
// id of the study that is open. No screen code here.
// One key per study means a damaged entry cannot take the other studies with it.

import { StoreError } from './store.js';
import { recordChange, defaultEnv } from './model.js';

const STUDY_PREFIX = 'study:';
const CURRENT_KEY = 'currentStudyId';
const DRAFT_KEY = 'draft';

// `env` supplies the clock for `changedAt`, so tests can use a fixed time.
export function createRepo(store, env = defaultEnv) {
  // Returns { studies, damaged }: studies newest first, and the keys that could not be read.
  function listStudies() {
    const studies = [];
    const damaged = [];
    for (const key of store.keys()) {
      if (!key.startsWith(STUDY_PREFIX)) continue;
      try {
        const study = store.load(key);
        if (study && typeof study === 'object' && typeof study.id === 'string') studies.push(study);
        else damaged.push(key);
      } catch (err) {
        if (!(err instanceof StoreError)) throw err;
        damaged.push(key);
      }
    }
    studies.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return { studies, damaged };
  }

  function loadStudy(id) {
    return store.load(STUDY_PREFIX + id);
  }

  // D28: notes the time when anything in the study changed.
  function saveStudy(study) {
    let previous;
    try {
      previous = loadStudy(study.id);
    } catch (err) {
      if (!(err instanceof StoreError)) throw err;
    }
    store.save(STUDY_PREFIX + study.id, recordChange(previous, study, env));
  }

  // Saves a study from a backup file exactly as it is (FR7 import), so it
  // does not count as changed since that backup.
  function restoreStudy(study) {
    store.save(STUDY_PREFIX + study.id, study);
  }

  // Permanent (D23): the screen asks for confirmation first.
  function deleteStudy(id) {
    store.remove(STUDY_PREFIX + id);
    if (currentStudyId() === id) setCurrentStudyId(null);
  }

  function currentStudyId() {
    try {
      const id = store.load(CURRENT_KEY);
      return typeof id === 'string' ? id : null;
    } catch (err) {
      if (err instanceof StoreError) return null;
      throw err;
    }
  }

  // The open study, or null if none is chosen or it no longer exists.
  function currentStudy() {
    const id = currentStudyId();
    if (id === null) return null;
    return loadStudy(id) ?? null;
  }

  function setCurrentStudyId(id) {
    if (id === null) store.remove(CURRENT_KEY);
    else store.save(CURRENT_KEY, id);
  }

  // The note being typed in the Live log, so closing the tab mid-note loses nothing.
  // Kept for one session only: { sessionId, note, screenId, type }.
  function loadDraft(sessionId) {
    try {
      const draft = store.load(DRAFT_KEY);
      return draft && draft.sessionId === sessionId ? draft : null;
    } catch (err) {
      if (err instanceof StoreError) return null;
      throw err;
    }
  }

  function saveDraft(draft) {
    store.save(DRAFT_KEY, draft);
  }

  function clearDraft() {
    store.remove(DRAFT_KEY);
  }

  return {
    listStudies, loadStudy, saveStudy, restoreStudy, deleteStudy, currentStudyId, currentStudy, setCurrentStudyId,
    loadDraft, saveDraft, clearDraft,
  };
}
