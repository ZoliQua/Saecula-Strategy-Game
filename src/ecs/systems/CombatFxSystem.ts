import Phaser from 'phaser';
import { PROJECTILE_HIT_RADIUS, UNIT_PROJECTILE } from '../../config/balance';
import { COMBAT_FX, SHOT_LOOK } from '../../config/visual';
import { distanceToEntity, entityPoint, type Point } from '../../game/targetGeometry';
import { ART_SCALE } from '../../iso/art/canvas';
import { EXPLOSION_FRAMES, EXPLOSION_ORIGIN_Y } from '../../iso/art/explosionArt';
import { LightManager } from '../../iso/art/lighting/LightManager';
import { tileToScreen } from '../../iso/coordinates';
import { FX_KEYS } from '../../iso/textures';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { CombatEmitters } from './combatFx/CombatEmitters';
import { GROUND_FX_DEPTH, STANDING_FX_DEPTH, tileSeen } from './combatFx/fxContext';
import { decalAlpha, frameAt, shakeIntensity, shotPose } from './combatFx/fxMath';
import { TimedImages } from './combatFx/TimedImages';
import type { RenderSystem } from './RenderSystem';

type Shot = NonNullable<Entity['projectile']>;
type Positioned = Entity & { position: { tx: number; ty: number } };

const SCALE = 1 / ART_SCALE;
/** Effects this far outside the camera view are skipped entirely (world px). */
const VIEW_MARGIN = 120;

interface Pending {
  readonly at: number;
  readonly x: number;
  readonly y: number;
  readonly tx: number;
  readonly ty: number;
}

/**
 * Cosmetic combat effects, driven by watching the ECS (never writing
 * it): muzzle flashes + gun smoke + light flashes when shots are fired,
 * blasts with scorch marks and camera shake when cannonballs land,
 * stuck arrows and dirt kicks for misses, sparks and a white hit flash
 * for blows, dust when bodies fall and buildings collapse. Everything
 * is pooled and skipped on tiles the viewer cannot see.
 */
export class CombatFxSystem {
  private readonly fx: CombatEmitters;
  private readonly muzzles: TimedImages;
  private readonly blasts: TimedImages;
  private readonly scorches: TimedImages;
  private readonly stuck: TimedImages;
  private readonly hp = new Map<Entity, number>();
  private readonly cooldown = new Map<Entity, number>();
  private readonly lastTarget = new Map<Entity, number>();
  private readonly falls: Pending[] = [];
  private readonly unsubscribe: Array<() => void> = [];
  private fog: FogOfWarData | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
    private readonly render: RenderSystem,
  ) {
    this.fx = new CombatEmitters(scene);
    const image = (key: string, ox: number, oy: number, add = false) => () =>
      scene.add.image(0, 0, key).setScale(SCALE).setOrigin(ox, oy).setBlendMode(add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    this.muzzles = new TimedImages(image(FX_KEYS.muzzle, 0.07, 0.5, true), 32);
    this.blasts = new TimedImages(image(FX_KEYS.explosion, 0.5, EXPLOSION_ORIGIN_Y), 10);
    this.scorches = new TimedImages(() => image(FX_KEYS.scorch, 0.5, 0.5)().setDepth(GROUND_FX_DEPTH), 40);
    this.stuck = new TimedImages(image(FX_KEYS.arrow, 0.86, 0.5), 60);

    const shots = world.with('projectile');
    const health = world.with('health', 'position');
    const attackers = world.with('attacker');
    const dying = world.with('dying');
    this.unsubscribe.push(
      shots.onEntityAdded.subscribe((e) => this.onFired(e.projectile)),
      shots.onEntityRemoved.subscribe((e) => this.onLanded(e.projectile)),
      health.onEntityRemoved.subscribe((e) => this.hp.delete(e)),
      attackers.onEntityRemoved.subscribe((e) => {
        this.cooldown.delete(e);
        this.lastTarget.delete(e);
      }),
      dying.onEntityAdded.subscribe((e) => this.onDeath(e)),
    );
  }

  setFogContext(fog: FogOfWarData): void {
    this.fog = fog;
  }

  update(): void {
    const now = this.scene.time.now;
    this.watchHits();
    this.watchStrikes();
    while (this.falls.length > 0 && this.falls[0]!.at <= now) {
      const f = this.falls.shift()!;
      if (tileSeen(this.fog, f.tx, f.ty)) this.fx.bodyFall(f.x, f.y);
    }
    this.muzzles.update(now);
    this.blasts.update(now);
    this.scorches.update(now);
    this.stuck.update(now);
  }

  private onFired(shot: Shot): void {
    if (shot.kind !== 'bullet' && shot.kind !== 'cannonball') return;
    if (!this.shows(shot.from.x, shot.from.y)) return;
    const look = SHOT_LOOK[shot.kind];
    const pose = shotPose(shot.from, shot.to, 0, shot.arcHeight, look.liftFrom, look.liftTo);
    const d = { x: Math.cos(pose.angle), y: Math.sin(pose.angle) };
    const reach = COMBAT_FX.muzzle[shot.kind];
    const mx = pose.sx + d.x * reach;
    const my = pose.sy + d.y * reach;
    const depth = shot.from.x + shot.from.y + STANDING_FX_DEPTH;
    const life = COMBAT_FX.muzzleFlashMs[shot.kind];
    const big = shot.kind === 'cannonball' ? 1.5 : 0.75;
    const flash = this.muzzles.spawn(this.scene.time.now, (img, age) => {
      const k = age / life;
      img.setAlpha(Math.max(0, 1 - k * k)).setScale(SCALE * big * (0.8 + 0.5 * k), SCALE * big * (1 - 0.3 * k));
      return k < 1;
    });
    flash.setPosition(mx, my).setRotation(pose.angle).setDepth(depth);
    const light = shot.kind === 'cannonball' ? COMBAT_FX.light.cannon : COMBAT_FX.light.musket;
    LightManager.of(this.scene)?.flash(pose.gx + d.x * reach, pose.gy + d.y * reach * 0.5, light.color, light.radius, light.ms, light.intensity);
    if (shot.kind === 'bullet') this.fx.musketShot(mx, my, d);
    else this.fx.cannonShot(mx, my, d, pose.gx, pose.gy);
  }

  private onLanded(shot: Shot): void {
    if (shot.elapsedMs < shot.durationMs) return;
    if (!this.shows(shot.to.x, shot.to.y)) return;
    const g = tileToScreen({ tx: shot.to.x, ty: shot.to.y });
    if (shot.kind === 'cannonball') {
      this.blast(shot, g.sx, g.sy);
      return;
    }
    const target = this.findTarget(shot.targetId);
    const hit = !!target && distanceToEntity(shot.to, target) <= PROJECTILE_HIT_RADIUS;
    if (hit) return; // The target's hit flash and dust cover it.
    this.fx.puff(g.sx, g.sy, 2);
    if (shot.kind === 'bullet') return;
    const look = SHOT_LOOK[shot.kind];
    const end = shotPose(shot.from, shot.to, 1, shot.arcHeight, look.liftFrom, look.liftTo);
    // Planted in the turf: tip in the ground, shaft along the incoming angle.
    const angle = Math.max(0.35, Math.min(Math.PI - 0.35, end.angle));
    const { tx, ty } = { tx: shot.to.x, ty: shot.to.y };
    const life = COMBAT_FX.stuckArrowMs;
    const img = this.stuck.spawn(this.scene.time.now, (im, age) => {
      im.setVisible(tileSeen(this.fog, tx, ty)).setAlpha(Math.min(1, 3 * (1 - age / life)));
      return age < life;
    });
    img.setTexture(shot.kind === 'bolt' ? FX_KEYS.bolt : FX_KEYS.arrow);
    img.setPosition(g.sx, g.sy).setRotation(angle).setDepth(tx + ty + 0.25);
  }

  private blast(shot: Shot, x: number, y: number): void {
    const now = this.scene.time.now;
    const { x: tx, y: ty } = shot.to;
    const frameMs = COMBAT_FX.explosionFrameMs;
    const boom = this.blasts.spawn(now, (img, age) => {
      const f = frameAt(age, frameMs, EXPLOSION_FRAMES);
      if (f < 0) return false;
      img.setFrame(f).setVisible(tileSeen(this.fog, tx, ty));
      return true;
    });
    boom.setPosition(x, y).setDepth(tx + ty + 2.5).setFlipX(Math.random() < 0.5);
    const life = COMBAT_FX.scorchLifeMs;
    const scorch = this.scorches.spawn(now, (img, age) => {
      img.setVisible(tileSeen(this.fog, tx, ty)).setAlpha(0.9 * decalAlpha(age, life, COMBAT_FX.scorchHold));
      return age < life;
    });
    scorch.setPosition(x, y).setRotation((Math.random() - 0.5) * 0.3).setScale(SCALE * (0.85 + Math.random() * 0.3));
    this.fx.blast(x, y);
    const l = COMBAT_FX.light.blast;
    LightManager.of(this.scene)?.flash(x, y, l.color, l.radius, l.ms, l.intensity);
    this.shake(x, y);
  }

  private shake(x: number, y: number): void {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const s = COMBAT_FX.shake;
    const k = shakeIntensity(x - v.centerX, y - v.centerY, v.width / 2, v.height / 2, s.max, s.edgeKeep);
    if (k > 0) cam.shake(s.ms, k);
  }

  /** Any unit losing HP flashes white and scuffs a little dust at its feet. */
  private watchHits(): void {
    for (const e of this.world.with('health', 'position')) {
      const prev = this.hp.get(e);
      const cur = e.health.current;
      this.hp.set(e, cur);
      if (prev === undefined || cur >= prev || !e.unit) continue;
      if (!this.shows(e.position.tx, e.position.ty)) continue;
      this.render.flashHit(e, COMBAT_FX.hitFlashMs);
      const p = screenOf(entityPoint(e));
      this.fx.scuff(p.sx, p.sy);
    }
  }

  /** Melee blows (cooldown restarts on a non-shooter): sparks at the contact point. */
  private watchStrikes(): void {
    for (const a of this.world.with('attacker', 'position')) {
      const last = this.cooldown.get(a) ?? 0;
      const cur = a.attacker.cooldownRemaining;
      this.cooldown.set(a, cur);
      if (a.attackIntent) this.lastTarget.set(a, a.attackIntent.targetId);
      if (!(cur > last + 1) || isShooter(a)) continue;
      if (!this.shows(a.position.tx, a.position.ty)) continue;
      const from = screenOf(entityPoint(a));
      const target = this.findTarget(this.lastTarget.get(a) ?? -1);
      const to = target ? screenOf(entityPoint(target)) : from;
      this.fx.strike(from.sx + (to.sx - from.sx) * 0.55, from.sy + (to.sy - from.sy) * 0.55 - 14);
    }
  }

  private onDeath(e: Entity): void {
    if (!e.position || !this.shows(e.position.tx, e.position.ty)) return;
    const b = e.building;
    if (b) {
      const c = tileToScreen({ tx: e.position.tx + (b.footprint.width - 1) / 2, ty: e.position.ty + (b.footprint.height - 1) / 2 });
      this.fx.collapse(c.sx, c.sy, (b.footprint.width + b.footprint.height) * 16);
      return;
    }
    if (!e.unit) return;
    const p = screenOf(entityPoint(e as Positioned));
    this.falls.push({ at: this.scene.time.now + COMBAT_FX.deathDustDelayMs, x: p.sx, y: p.sy, tx: e.position.tx, ty: e.position.ty });
  }

  /** On a tile the viewer sees, and near enough the camera to matter. */
  private shows(tx: number, ty: number): boolean {
    if (!tileSeen(this.fog, tx, ty)) return false;
    const { sx, sy } = tileToScreen({ tx, ty });
    const v = this.scene.cameras.main.worldView;
    return sx > v.x - VIEW_MARGIN && sx < v.right + VIEW_MARGIN && sy > v.y - VIEW_MARGIN && sy < v.bottom + VIEW_MARGIN;
  }

  private findTarget(id: number): Positioned | undefined {
    if (id < 0) return undefined;
    for (const e of this.world.with('health', 'position')) if (e.id === id) return e;
    return undefined;
  }

  destroy(): void {
    for (const u of this.unsubscribe) u();
    this.fx.destroy();
    this.muzzles.destroy();
    this.blasts.destroy();
    this.scorches.destroy();
    this.stuck.destroy();
    this.hp.clear();
    this.cooldown.clear();
    this.lastTarget.clear();
  }
}

/** Ranged attackers (their shots get their own effects). Mirrors CombatSystem.projectileKindFor. */
function isShooter(a: Entity): boolean {
  if (a.unit) return UNIT_PROJECTILE[a.unit.unitType] !== undefined;
  return a.building?.type === 'tower';
}

function screenOf(p: Point): { sx: number; sy: number } {
  return tileToScreen({ tx: p.x, ty: p.y });
}
