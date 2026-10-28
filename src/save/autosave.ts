import { AUTOSAVE_INTERVAL_MS } from '../config/constants';

/**
 * Game-time clock for the autosave (CLAUDE.md §5.4): `tick` is true once
 * every `intervalMs` of summed game deltas. A long frame that spans
 * several intervals fires once and starts the next interval afresh.
 */
export class AutosaveClock {
  private elapsedMs = 0;

  constructor(private readonly intervalMs: number = AUTOSAVE_INTERVAL_MS) {}

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
