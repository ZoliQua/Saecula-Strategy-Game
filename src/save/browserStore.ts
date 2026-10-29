import localforage from 'localforage';
import type { MatchStore } from '../stats/matchLog';
import type { KeyValueStore } from './storage';

/**
 * The browser's save store (Decision 5): a localforage instance over
 * IndexedDB (`name: 'isorts', storeName: 'saves'`), or null when one
 * cannot be created. A store that fails later (private mode) rejects its
 * calls, which SaveStorage reports as 'unavailable'.
 */
export function browserSaveStore(): KeyValueStore | null {
  try {
    return localforage.createInstance({ name: 'isorts', storeName: 'saves' });
  } catch {
    return null;
  }
}

/**
 * The browser's match log store (M7 Decision 11): its own localforage
 * instance (`name: 'isorts', storeName: 'matches'`), or null when one
 * cannot be created; a failing store is reported by MatchLog.
 */
export function browserMatchStore(): MatchStore | null {
  try {
    return localforage.createInstance({ name: 'isorts', storeName: 'matches' });
  } catch {
    return null;
  }
}
