import Phaser from 'phaser';
import { tileToScreen } from '../../iso/coordinates';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { projectileMotion } from './projectileMotion';

const COLORS = { arrow: 0xe8d9b0, bolt: 0xd8d0c0, bullet: 0xffe9a0, cannonball: 0x2a2623 } as const;
const LENGTH = { arrow: 12, bolt: 9, bullet: 5, cannonball: 0 } as const;

/**
 * Placeholder projectile visuals (Task 6 replaces this): one shared
 * Graphics redrawn each frame, so there is nothing to clean up per
 * projectile when its entity is removed.
 */
export class ProjectileRenderSystem {
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly world: EcsWorld) {
    this.gfx = scene.add.graphics();
  }

  update(): void {
    const g = this.gfx;
    g.clear();
    let depth = 0;
    for (const e of this.world.with('projectile') as Iterable<Entity & { projectile: NonNullable<Entity['projectile']> }>) {
      const p = e.projectile;
      const m = projectileMotion(p.from, p.to, p.elapsedMs / p.durationMs, p.arcHeight);
      const color = COLORS[p.kind];
      const len = LENGTH[p.kind];
      if (len === 0) {
        const ground = tileToScreen({ tx: m.x, ty: m.y });
        g.fillStyle(0x000000, 0.25).fillEllipse(ground.sx, ground.sy, 8, 4);
        g.fillStyle(color, 1).fillCircle(m.sx, m.sy, 4);
      } else {
        g.lineStyle(2, color, 1);
        g.lineBetween(m.sx - Math.cos(m.angle) * len, m.sy - Math.sin(m.angle) * len, m.sx, m.sy);
      }
      depth = Math.max(depth, m.x + m.y);
    }
    // One layer for all shots, just in front of the furthest one.
    g.setDepth(depth + 0.5);
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
