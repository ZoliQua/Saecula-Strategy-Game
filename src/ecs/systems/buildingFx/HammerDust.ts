import type Phaser from 'phaser';
import { BUILDING_FX } from '../../../config/visual';
import { tileToScreen } from '../../../iso/coordinates';
import type { Direction } from '../../../types';
import type { Entity } from '../../components';
import type { EcsWorld } from '../../world';
import { siteLookup, unitAnimState } from '../unitAnim';
import type { BuildingEmitters } from './BuildingEmitters';
import { isStrike } from './damageMath';

/** Work-animation frame in which the tool comes down (poses.ts workPose). */
const STRIKE_FRAME = 2;
/** How far in front of the builder's feet the tool lands, world px. */
const REACH = 10;
const VIEW_MARGIN = 60;

const STEP: Record<Direction, readonly [number, number]> = {
  N: [0, -1],
  NE: [1, -1],
  E: [1, 0],
  SE: [1, 1],
  S: [0, 1],
  SW: [-1, 1],
  W: [-1, 0],
  NW: [-1, -1],
};

/**
 * Hammer dust on construction sites: every time a builder's tool comes
 * down in its work animation (same frame clock as the sprite), a puff of
 * dust and the odd wood chip fly up where it lands. Only for builders
 * the viewer sees on screen.
 */
export class HammerDust {
  private readonly lastFrame = new Map<Entity, number>();
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    world: EcsWorld,
    private readonly fx: BuildingEmitters,
  ) {
    this.unsubscribe = world.with('buildCommand').onEntityRemoved.subscribe((e) => this.lastFrame.delete(e));
  }

  update(world: EcsWorld, now: number): void {
    const v = this.scene.cameras.main.worldView;
    const siteOf = siteLookup(world);
    for (const e of world.with('buildCommand', 'position', 'unit')) {
      const { anim, i, heading } = unitAnimState(e, now, siteOf);
      const frame = anim === 'work' ? i : -1;
      const prev = this.lastFrame.get(e);
      this.lastFrame.set(e, frame);
      const sprite = e.sprite;
      if (!sprite?.visible || !isStrike(prev, frame, STRIKE_FRAME)) continue;
      if (sprite.x < v.x - VIEW_MARGIN || sprite.x > v.right + VIEW_MARGIN || sprite.y < v.y - VIEW_MARGIN || sprite.y > v.bottom + VIEW_MARGIN) continue;
      const [dx, dy] = STEP[heading];
      const s = tileToScreen({ tx: dx, ty: dy });
      const len = Math.hypot(s.sx, s.sy) || 1;
      this.fx.hammerStrike(sprite.x + (s.sx / len) * REACH, sprite.y + (s.sy / len) * REACH * 0.5 - 3, BUILDING_FX.hammerDust);
    }
  }

  destroy(): void {
    this.unsubscribe();
    this.lastFrame.clear();
  }
}
