import localforage from 'localforage';
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
