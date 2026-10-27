import { PATHFIND_FRAME_MS, PATHFINDS_PER_FRAME } from '../config/constants';

/** Anything that hands out A* searches. */
export interface PathAllowance {
  /** True when one more search may run this tick (and counts it). */
  take(): boolean;
}

/**
 * The shared per-tick A* budget (CLAUDE.md §10: at most 5 searches per
 * frame). Systems ask `take()` before every search; a refused caller keeps
 * its intent and asks again next tick, so excess searches queue up instead
 * of spiking one frame. A tick longer than a 60 Hz frame (headless 100 ms
 * steps, dev time scale) gets a proportionally larger share, so game-time
 * throughput does not depend on the tick length.
 */
export class PathBudget implements PathAllowance {
  private left: number;

  /** `maxPerTick` caps the scaled share (the game: a GC hitch must not grant a burst). */
  constructor(
    private readonly perFrame: number = PATHFINDS_PER_FRAME,
    private readonly maxPerTick: number = Infinity,
  ) {
    this.left = perFrame;
  }

  /** Starts a tick of `deltaMs` game time; unused searches do not carry over. */
  reset(deltaMs: number): void {
    const scaled = Math.max(this.perFrame, Math.round((this.perFrame * deltaMs) / PATHFIND_FRAME_MS));
    this.left = Math.min(scaled, this.maxPerTick);
  }

  take(): boolean {
    if (this.left <= 0) return false;
    this.left--;
    return true;
  }
}

/** For systems run on their own (unit tests): every search is allowed. */
export const UNLIMITED_PATHS: PathAllowance = { take: () => true };
