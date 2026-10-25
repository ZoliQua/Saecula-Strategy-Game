import Phaser from 'phaser';
import { tileToScreen } from '../../iso/coordinates';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

interface BarRecord {
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
}

const BAR_WIDTH = 26;
const BAR_HEIGHT = 4;

/**
 * Draws a thin HP bar above every entity with a health component,
 * unless HP is full — full-HP bars just add visual noise. Hidden
 * entirely for entities that are dying.
 */
export class HealthBarSystem {
  private readonly scene: Phaser.Scene;
  private readonly world: EcsWorld;
  private readonly bars = new Map<number, BarRecord>();

  constructor(scene: Phaser.Scene, world: EcsWorld) {
    this.scene = scene;
    this.world = world;
  }

  update(): void {
    const alive = new Set<number>();
    for (const entity of this.world.with('position', 'health')) {
      if (entity.id === undefined) continue;
      const full = entity.health.current >= entity.health.max;
      const dying = (entity as Entity).dying !== undefined;
      if (full || dying) continue;
      alive.add(entity.id);

      let record = this.bars.get(entity.id);
      if (!record) {
        record = this.createBar();
        this.bars.set(entity.id, record);
      }
      this.positionBar(record, entity);
    }
    // Cull removed / full-HP / dying bars.
    for (const [id, record] of this.bars) {
      if (!alive.has(id)) {
        record.bg.destroy();
        record.fill.destroy();
        this.bars.delete(id);
      }
    }
  }

  destroyAll(): void {
    for (const record of this.bars.values()) {
      record.bg.destroy();
      record.fill.destroy();
    }
    this.bars.clear();
  }

  private createBar(): BarRecord {
    const bg = this.scene.add.rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x0b0a09, 0.8);
    bg.setStrokeStyle(1, 0x0b0a09, 0.9);
    const fill = this.scene.add.rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT - 1, 0x7ed491, 1);
    bg.setOrigin(0, 0.5);
    fill.setOrigin(0, 0.5);
    return { bg, fill };
  }

  private positionBar(record: BarRecord, entity: Entity): void {
    if (!entity.position || !entity.health) return;
    const b = entity.building;
    let width = BAR_WIDTH;
    let sx: number;
    let sy: number;
    const sprite = entity.sprite;
    if (sprite) {
      // Float just above the sprite's visible top.
      sx = sprite.x;
      sy = sprite.y - sprite.displayHeight * sprite.originY + (b ? 18 : 4);
    } else {
      const p = tileToScreen(entity.position);
      sx = p.sx;
      sy = p.sy - 40;
    }
    if (b) width = Math.max(BAR_WIDTH, (b.footprint.width + b.footprint.height) * 12);
    const pct = Math.max(0, entity.health.current / entity.health.max);
    const depth = 8_800;
    record.bg.setPosition(sx - width / 2, sy);
    record.bg.setSize(width, BAR_HEIGHT);
    record.bg.setDepth(depth);
    record.fill.setPosition(sx - width / 2, sy);
    record.fill.setSize(Math.round(width * pct), BAR_HEIGHT - 1);
    record.fill.setDepth(depth + 0.01);
    record.fill.setFillStyle(hpColor(pct));
  }
}

function hpColor(pct: number): number {
  if (pct > 0.5) return 0x7ed491;
  if (pct > 0.25) return 0xf5c46a;
  return 0xff7a6b;
}
