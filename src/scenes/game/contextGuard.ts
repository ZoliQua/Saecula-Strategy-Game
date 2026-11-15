import type { SaveOutcome } from './MatchSave';

/**
 * What the lost-context card says: the match is being saved, it was saved
 * to the autosave slot, it could not be saved (the older autosave is
 * offered), or no undecided match was running (a plain reload).
 */
export type ContextLostState = 'saving' | 'saved' | 'notSaved' | 'noMatch';

/** A running, undecided match that can stop and save itself (GameScene.emergencySave). */
export interface GuardedMatch {
  /** Stops the match and saves it to the autosave slot; null when nothing can be saved. */
  emergencySave(): Promise<SaveOutcome> | null;
}

export interface ContextGuardDeps {
  /** The match to save, or null outside a match. */
  readonly match: () => GuardedMatch | null;
  /** Shows (or updates) the lost-context card. */
  readonly show: (state: ContextLostState) => void;
}

/**
 * The WebGL context is gone (GPU memory pressure, driver reset): the
 * game state lives in the ECS world, not on the GPU, so the match is
 * stopped and saved, and the card offers to reload and continue. Never
 * throws; resolves the card's final state.
 */
export async function handleContextLost(deps: ContextGuardDeps): Promise<ContextLostState> {
  let pending: Promise<SaveOutcome> | null = null;
  try {
    pending = deps.match()?.emergencySave() ?? null;
  } catch {
    pending = null;
  }
  if (!pending) {
    deps.show('noMatch');
    return 'noMatch';
  }
  deps.show('saving');
  let state: ContextLostState;
  try {
    state = (await pending).ok ? 'saved' : 'notSaved';
  } catch {
    state = 'notSaved';
  }
  deps.show(state);
  return state;
}

/**
 * Listens for the canvas's `webglcontextlost` and runs handleContextLost
 * once (a second loss while the card is up changes nothing). Returns the
 * uninstaller.
 */
export function installContextGuard(canvas: EventTarget, deps: ContextGuardDeps): () => void {
  let fired = false;
  const onLost = (): void => {
    if (fired) return;
    fired = true;
    void handleContextLost(deps);
  };
  canvas.addEventListener('webglcontextlost', onLost);
  return () => canvas.removeEventListener('webglcontextlost', onLost);
}
