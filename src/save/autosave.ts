import { AUTOSAVE_INTERVAL_MS } from '../config/constants';

/**
 * Game-time clock for the autosave (CLAUDE.md §5.4): `tick` is true once
 * every `intervalMs` of summed game deltas. A long frame that spans
 * several intervals fires once and starts the next interval afresh.
 * `gameTimeMs` (a loaded save's clock) puts the marks on absolute game
 * time: multiples of `intervalMs`.
 */
export class AutosaveClock {
  private elapsedMs: number;

  constructor(
    private readonly intervalMs: number = AUTOSAVE_INTERVAL_MS,
    gameTimeMs = 0,
  ) {
    this.elapsedMs = gameTimeMs % intervalMs;
  }

  tick(gameDeltaMs: number): boolean {
    this.elapsedMs += gameDeltaMs;
    if (this.elapsedMs < this.intervalMs) return false;
    this.elapsedMs %= this.intervalMs;
    return true;
  }

  reset(): void {
    this.elapsedMs = 0;
  }
}
