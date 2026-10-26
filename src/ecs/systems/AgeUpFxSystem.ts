import Phaser from 'phaser';
import { AGE_UP_FX } from '../../config/visual';
import { gameEvents } from '../../game/events';
import { AGE_STYLED_BUILDINGS } from '../../iso/art/architecture/ageStyle';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../iso/art/canvas';
import { LightManager } from '../../iso/art/lighting/LightManager';
import { constructionKey, FX_KEYS } from '../../iso/textures';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { ageUpDelays, rippleOrigin, type AgeUpTarget } from './ageUpFx/ageUpSchedule';
import type { RenderSystem } from './RenderSystem';

const FX_DEPTH = 8_500;

/**
 * Age-up transformation (cosmetic): when a player reaches a new age,
 * the buildings the viewer can see on screen change style one after
 * another, rippling out from the town centre — scaffolding and a dust
 * burst, then a warm light flash, rising sparks and a little settle as
 * the new age's art appears. Buildings off screen or hidden by fog
 * re-skin silently (RenderSystem). Reads the ECS, never writes it.
 */
export class AgeUpFxSystem {
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly timers = new Set<Phaser.Time.TimerEvent>();
  private readonly props = new Set<Phaser.GameObjects.Image>();
  private readonly held = new Set<Entity>();
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
    private readonly render: RenderSystem,
  ) {
    this.dust = scene.add
      .particles(0, 0, FX_KEYS.dust, {
        emitting: false,
        lifespan: { min: 700, max: 1300 },
        speedX: { min: -38, max: 38 },
        speedY: { min: -26, max: -4 },
        scale: { start: 0.7, end: 2.1 },
        alpha: { start: 0.7, end: 0 },
        rotate: { min: 0, max: 360 },
      })
      .setDepth(FX_DEPTH);
    this.sparks = scene.add
      .particles(0, 0, FX_KEYS.spark, {
        emitting: false,
        lifespan: { min: 700, max: 1400 },
        speedX: { min: -14, max: 14 },
        speedY: { min: -70, max: -30 },
        gravityY: 20,
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(FX_DEPTH + 1);
    this.unsubscribe = gameEvents.on('ageChanged', ({ playerId }) => this.start(playerId));
  }

  /** Schedules the transformation of `playerId`'s on-screen buildings. */
  private start(playerId: number): void {
    const view = this.scene.cameras.main.worldView;
    const targets: AgeUpTarget<Entity>[] = [];
    for (const e of this.world.with('building', 'position', 'owner')) {
      const sprite = e.sprite;
      if (e.owner.playerId !== playerId || !sprite || e.dying || !sprite.visible) continue;
      if (!AGE_STYLED_BUILDINGS.includes(e.building.type)) continue;
      if (!Phaser.Geom.Rectangle.Overlaps(view, sprite.getBounds())) continue;
      const fp = e.building.footprint;
      targets.push({ item: e, tx: e.position.tx + fp.width / 2, ty: e.position.ty + fp.height / 2 });
    }
    const origin = rippleOrigin(targets, (e) => e.building?.type === 'town_center');
    for (const { item, delayMs } of ageUpDelays(targets, origin, AGE_UP_FX)) {
      this.render.holdReskin(item);
      this.held.add(item);
      this.after(delayMs, () => this.transform(item));
    }
  }

  private transform(e: Entity): void {
    const sprite = e.sprite;
    const fp = e.building?.footprint;
    if (!sprite?.active || !fp) {
      this.release(e);
      return;
    }
    const tiles = fp.width;
    const { x, y } = sprite;
    const scaffold = this.scene.add.image(x, y, constructionKey(tiles)).setScale(1 / ART_SCALE);
    scaffold.setOrigin(0.5, 1 - BUILDING_BOTTOM_PAD / scaffold.height).setDepth(sprite.depth + 0.02).setAlpha(0);
    this.props.add(scaffold);
    this.scene.tweens.add({ targets: scaffold, alpha: 0.95, duration: AGE_UP_FX.scaffoldInMs });
    this.burst(this.dust, x, y, tiles, AGE_UP_FX.dustPerTile * tiles);
    this.after(AGE_UP_FX.swapMs, () => {
      this.release(e);
      if (!sprite.active) return;
      const lift = sprite.displayHeight * 0.35;
      LightManager.of(this.scene)?.flash(x, y - 8, AGE_UP_FX.flash.color, AGE_UP_FX.flash.radiusPerTile * (tiles + 1), AGE_UP_FX.flash.ms, AGE_UP_FX.flash.intensity);
      this.burst(this.sparks, x, y - lift, tiles, AGE_UP_FX.sparksPerTile * tiles);
      this.burst(this.dust, x, y, tiles, AGE_UP_FX.dustPerTile * tiles);
      this.glow(x, y - lift, tiles, sprite.depth + 0.03);
      // The new building settles in with a small squash and stretch.
      const sx = sprite.scaleX;
      const sy = sprite.scaleY;
      sprite.setScale(sx * 1.03, sy * 0.92);
      this.scene.tweens.add({ targets: sprite, scaleX: sx, scaleY: sy, duration: 420, ease: 'Back.easeOut' });
      this.scene.tweens.add({
        targets: scaffold,
        alpha: 0,
        duration: AGE_UP_FX.scaffoldOutMs,
        onComplete: () => {
          this.props.delete(scaffold);
          scaffold.destroy();
        },
      });
    });
  }

  private glow(x: number, y: number, tiles: number, depth: number): void {
    const img = this.scene.add.image(x, y, FX_KEYS.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    img.setScale(tiles * 1.4).setAlpha(0.85);
    this.props.add(img);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scale: tiles * 2.2,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.props.delete(img);
        img.destroy();
      },
    });
  }

  /** Emits `count` particles spread over the footprint's ground diamond around (x, y). */
  private burst(em: Phaser.GameObjects.Particles.ParticleEmitter, x: number, y: number, tiles: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = (Math.random() - 0.5) * 2;
      const b = Math.random();
      em.emitParticleAt(x + a * tiles * 30, y - b * tiles * 16 - 4);
    }
  }

  private release(e: Entity): void {
    if (!this.held.delete(e)) return;
    this.render.releaseReskin(e);
  }

  private after(ms: number, fn: () => void): void {
    const timer = this.scene.time.delayedCall(ms, () => {
      this.timers.delete(timer);
      fn();
    });
    this.timers.add(timer);
  }

  destroy(): void {
    this.unsubscribe();
    for (const t of this.timers) t.remove(false);
    this.timers.clear();
    // Scene teardown: the sprites go with it, so nothing to re-skin.
    this.held.clear();
    for (const img of this.props) img.destroy();
    this.props.clear();
    this.dust.destroy();
    this.sparks.destroy();
  }
}
