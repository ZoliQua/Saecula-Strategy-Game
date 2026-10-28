import { hu } from '../../i18n/hu';
import { AutosaveClock } from '../../save/autosave';
import { serializeMatch, type MatchState } from '../../save/serializer';
import type { SaveStorage, SlotId, WriteResult } from '../../save/storage';
import { showHudNotice } from '../../ui/HUD';
import { uiStore } from '../../ui/store';

/** A save attempt: stored, the store unavailable, or the match could not be written (serializeMatch threw). */
export type SaveOutcome = WriteResult | { ok: false; reason: 'failed' };

/**
 * The live match's saves: manual slots on request and the autosave to
 * 'auto' every AUTOSAVE_INTERVAL_MS of game time. A save that cannot be
 * written leaves the slot's previous content and shows a Hungarian
 * notice; nothing here throws.
 */
export class MatchSave {
  private readonly clock: AutosaveClock;

  /** `gameTimeMs`: the match clock at start (a loaded save's), so autosaves fall on absolute 5-minute marks. */
  constructor(
    private readonly capture: () => MatchState,
    private readonly storage: SaveStorage,
    gameTimeMs = 0,
  ) {
    this.clock = new AutosaveClock(undefined, gameTimeMs);
  }

  /** Once per game frame with the game-time delta (paused frames do not run). */
  update(gameDeltaMs: number): void {
    if (this.clock.tick(gameDeltaMs)) void this.write('auto', hu.save.autosaved);
  }

  /** Saves the match to `slot` and shows the outcome. */
  saveTo(slot: SlotId): Promise<SaveOutcome> {
    return this.write(slot, hu.save.saved);
  }

  private async write(slot: SlotId, success: string): Promise<SaveOutcome> {
    let result: SaveOutcome;
    try {
      const save = serializeMatch(this.capture());
      result = await this.storage.write(slot, save);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('save failed', err);
      result = { ok: false, reason: 'failed' };
    }
    showHudNotice(result.ok ? success : result.reason === 'unavailable' ? hu.save.errors.unavailable : hu.save.errors.saveFailed);
    return result;
  }
}

/**
 * The live match as MatchState. The human's stockpile lives in the UI
 * store (src/ecs/research.ts uiWallet), so it is copied onto the human's
 * Player first; nothing in play reads the human Player's resources.
 */
export function liveMatchState(state: MatchState): MatchState {
  const human = state.players.human();
  if (human) human.resources = { ...uiStore.getState().resources };
  return state;
}
