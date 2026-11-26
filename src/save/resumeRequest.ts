/**
 * The sessionStorage key of a pending resume (CLAUDE.md §7.6: internal
 * keys keep the isorts prefix). Set just before the page reloads after a
 * lost WebGL context; the main menu takes it once and loads the autosave.
 */
export const RESUME_KEY = 'isorts.resume.v1';

/** The part of Storage the request uses (injectable for tests). */
export interface ResumeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserSession(): ResumeStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Asks the next page load (this tab only) to continue from the autosave.
 * Resolves false when the request cannot be kept (no or blocked storage).
 */
export function requestResume(storage: ResumeStorage | null = browserSession()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(RESUME_KEY, 'auto');
    return true;
  } catch {
    return false;
  }
}

/** Whether a resume was requested; the request is cleared either way (it is honoured once). */
export function takeResumeRequest(storage: ResumeStorage | null = browserSession()): boolean {
  try {
    if (!storage) return false;
    const pending = storage.getItem(RESUME_KEY) === 'auto';
    storage.removeItem(RESUME_KEY);
    return pending;
  } catch {
    return false;
  }
}
