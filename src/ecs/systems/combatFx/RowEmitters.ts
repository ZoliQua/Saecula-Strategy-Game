import type Phaser from 'phaser';
import { TILE_HEIGHT } from '../../../config/constants';
import { STANDING_FX_DEPTH } from './fxDepths';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/** Emitters per ground recipe: puffs alive at once in different rows each get their own depth. */
const POOL_SIZE = 6;

/**
 * Ground-level particles (dust, dirt) sorted with the world: a small pool
 * of identical emitters, each moved to the draw depth of the row it last
 * emitted on (world y / half a tile = tx + ty), so scenery in front of a
 * puff covers it. An emitter already on the row is reused; otherwise the
 * least recently used one moves.
 */
export class RowEmitters {
  private readonly pool: Emitter[];
  private readonly lastUsed: number[];
  private clock = 0;

  constructor(make: () => Emitter) {
    this.pool = Array.from({ length: POOL_SIZE }, make);
    this.lastUsed = this.pool.map(() => 0);
  }

  emitParticleAt(x: number, y: number, count?: number): void {
    const depth = Math.round(y / (TILE_HEIGHT / 2)) + STANDING_FX_DEPTH;
    let pick = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i]?.depth === depth) {
        pick = i;
        break;
      }
      if ((this.lastUsed[i] ?? 0) < (this.lastUsed[pick] ?? 0)) pick = i;
    }
    const e = this.pool[pick];
    if (!e) return;
    this.lastUsed[pick] = ++this.clock;
    e.setDepth(depth).emitParticleAt(x, y, count);
  }

  destroy(): void {
    for (const e of this.pool) e.destroy();
  }
}
