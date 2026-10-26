import type Phaser from 'phaser';
import type { UnitType } from '../../../types';
import { UNIT_SPECS } from '../../../ecs/archetypes/unit';
import { unitArt } from './UnitArt';

/**
 * Creates the textures of every unit type (sheet allocation, first idle
 * frames, upload), one type per step, so the first in-game appearance of
 * a type does not hitch. Call step() once per frame during a transition.
 */
export class UnitArtPrewarm {
  private readonly queue: UnitType[];
  /** Total / worst single-step cost in ms (diagnostics). */
  totalMs = 0;
  maxStepMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    types: readonly UnitType[] = Object.keys(UNIT_SPECS) as UnitType[],
  ) {
    this.queue = [...types];
  }

  /** Warms one more type; returns true once everything is warm. */
  step(): boolean {
    const type = this.queue.shift();
    if (type) {
      const t0 = performance.now();
      unitArt(this.scene, type, UNIT_SPECS[type].textureKey, true);
      const dt = performance.now() - t0;
      this.totalMs += dt;
      this.maxStepMs = Math.max(this.maxStepMs, dt);
    }
    return this.queue.length === 0;
  }
}
