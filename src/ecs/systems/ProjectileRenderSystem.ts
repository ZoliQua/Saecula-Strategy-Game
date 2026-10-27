import Phaser from 'phaser';
import { ART_SCALE } from '../../iso/art/canvas';
import { SHOT_LOOK } from '../../config/visual';
import { tileToScreen } from '../../iso/coordinates';
import { lit } from '../../iso/art/lighting/LightManager';
import { FX_KEYS } from '../../iso/textures';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { ProjectileKind } from '../../types';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { SHOT_SHADOW_DEPTH, STANDING_FX_DEPTH, sunShadow, tileSeen } from './combatFx/fxContext';
import { releaseLift, shotPose } from './combatFx/fxMath';
import { ImagePool } from './combatFx/ImagePool';

type Shot = Entity & { projectile: NonNullable<Entity['projectile']> };

interface ShotVisual {
  readonly kind: ProjectileKind;
  readonly body: Phaser.GameObjects.Image;
  readonly trail: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  /** Screen direction of the ground track (the shadow's heading). */
  readonly groundAngle: number;
}

const SCALE = 1 / ART_SCALE;
const TRAIL_TEX_W = 40;
const SHADOW_TEX_W = 16;
/** Trails grow in over this long so they never poke out behind the bow. */
const TRAIL_GROW_MS = 90;
const TEXTURE: Record<ProjectileKind, string> = {
  arrow: FX_KEYS.arrow,
  bolt: FX_KEYS.bolt,
  bullet: FX_KEYS.bullet,
  cannonball: FX_KEYS.cannonball,
};
/** Body origin: the head of streak-like shots sits on the flight point. */
const ORIGIN_X: Record<ProjectileKind, number> = { arrow: 0.6, bolt: 0.6, bullet: 1, cannonball: 0.5 };

/**
 * Draws shots in flight: the projectile turned along its arc tangent,
 * a faint trail and a soft ground shadow cast along the sun that
 * shrinks and fades with height. Every image comes from a pool and is
 * returned when the projectile entity is removed. Reads the ECS only.
 */
export class ProjectileRenderSystem {
  private readonly shots: ReturnType<EcsWorld['with']>;
  private readonly visuals = new Map<Entity, ShotVisual>();
  private readonly bodies = new Map<ProjectileKind, ImagePool>();
  private readonly trails: ImagePool;
  private readonly shadows: ImagePool;
  private fog: FogOfWarData | null = null;

  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    world: EcsWorld,
  ) {
    this.shots = world.with('projectile');
    for (const kind of Object.keys(TEXTURE) as ProjectileKind[]) {
      // Arrows, bolts and balls are lit props; the hot musket ball streak glows (unlit, additive).
      const make = () => scene.add.image(0, 0, TEXTURE[kind]).setScale(SCALE).setOrigin(ORIGIN_X[kind], 0.5);
      this.bodies.set(kind, new ImagePool(kind === 'bullet' ? make : () => lit(make())));
    }
    this.trails = new ImagePool(() => scene.add.image(0, 0, FX_KEYS.trail).setOrigin(1, 0.5));
    this.shadows = new ImagePool(() => scene.add.image(0, 0, FX_KEYS.shotShadow).setDepth(SHOT_SHADOW_DEPTH));
    this.unsubscribe = this.shots.onEntityRemoved.subscribe((e: Entity) => this.release(e));
  }

  setFogContext(fog: FogOfWarData): void {
    this.fog = fog;
  }

  update(): void {
    const sun = sunShadow(this.scene);
    for (const e of this.shots as Iterable<Shot>) {
      const p = e.projectile;
      const look = SHOT_LOOK[p.kind];
      const v = this.visuals.get(e) ?? this.acquire(e);
      const t = Math.min(1, p.elapsedMs / p.durationMs);
      const gx = p.from.x + (p.to.x - p.from.x) * t;
      const gy = p.from.y + (p.to.y - p.from.y) * t;
      const seen = tileSeen(this.fog, gx, gy);
      v.body.setVisible(seen);
      v.trail.setVisible(seen && look.trailLength > 0);
      v.shadow.setVisible(seen && look.shadowWidth > 0);
      if (!seen) continue;

      const pose = shotPose(p.from, p.to, t, p.arcHeight, releaseLift(p, look), look.liftTo);
      const depth = gx + gy + STANDING_FX_DEPTH;
      v.body.setPosition(pose.sx, pose.sy).setDepth(depth);
      if (p.kind !== 'cannonball') v.body.setRotation(pose.angle);

      if (look.trailLength > 0) {
        const grow = Math.min(1, p.elapsedMs / TRAIL_GROW_MS);
        v.trail
          .setPosition(pose.sx, pose.sy)
          .setRotation(pose.angle)
          .setScale((look.trailLength / TRAIL_TEX_W) * grow * SCALE, SCALE)
          .setDepth(depth - 0.01)
          .setAlpha(look.trailAlpha);
      }
      if (look.shadowWidth > 0) {
        const fall = 1 / (1 + pose.lift / 45);
        const round = p.kind === 'cannonball';
        v.shadow
          .setPosition(pose.gx + pose.lift * sun.x, pose.gy + pose.lift * sun.y)
          .setRotation(round ? 0 : v.groundAngle)
          .setScale((look.shadowWidth / SHADOW_TEX_W) * SCALE * (0.6 + 0.4 * fall), (round ? 1 : 0.45) * SCALE * (0.6 + 0.4 * fall))
          .setAlpha(look.shadowAlpha * sun.strength * (0.35 + 0.65 * fall));
      }
    }
  }

  private acquire(e: Shot): ShotVisual {
    const p = e.projectile;
    const look = SHOT_LOOK[p.kind];
    const a = tileToScreen({ tx: p.from.x, ty: p.from.y });
    const b = tileToScreen({ tx: p.to.x, ty: p.to.y });
    const v: ShotVisual = {
      kind: p.kind,
      body: this.bodies.get(p.kind)!.acquire(),
      trail: this.trails.acquire().setTint(look.trailColor),
      shadow: this.shadows.acquire(),
      groundAngle: Math.atan2(b.sy - a.sy, b.sx - a.sx),
    };
    // Additive glow for the hot musket ball.
    v.body.setBlendMode(p.kind === 'bullet' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    this.visuals.set(e, v);
    return v;
  }

  private release(e: Entity): void {
    const v = this.visuals.get(e);
    if (!v) return;
    this.bodies.get(v.kind)?.release(v.body);
    this.trails.release(v.trail);
    this.shadows.release(v.shadow);
    this.visuals.delete(e);
  }

  destroy(): void {
    this.unsubscribe();
    for (const pool of this.bodies.values()) pool.destroy();
    this.trails.destroy();
    this.shadows.destroy();
    this.visuals.clear();
  }
}
