import type Phaser from 'phaser';
import type { CivId, UnitType } from '../../../types';
import { unitArt } from './UnitArt';

/**
 * Creates the textures of the given (unit type, civ) sheets (allocation,
 * first idle frames, upload), one sheet per step, so the first in-game
 * appearance of a type does not hitch. Call step() once per frame during
 * a transition. Which sheets: artLoadPlan prewarmUnitTypes.
 */
export class UnitArtPrewarm {
  private readonly queue: Array<[UnitType, CivId]> = [];
  /** Total / worst single-step cost in ms (diagnostics). */
  totalMs = 0;
  maxStepMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    sheets: ReadonlyArray<readonly [UnitType, CivId]>,
  ) {
    for (const [type, civ] of sheets) this.queue.push([type, civ]);
  }

  /** Warms one more sheet; returns true once everything is warm. */
  step(): boolean {
    const next = this.queue.shift();
    if (next) {
      const t0 = performance.now();
      unitArt(this.scene, next[0], next[1], true);
      const dt = performance.now() - t0;
      this.totalMs += dt;
      this.maxStepMs = Math.max(this.maxStepMs, dt);
    }
    return this.queue.length === 0;
  }
}
