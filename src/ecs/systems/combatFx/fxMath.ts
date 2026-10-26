import { TOWER_PLATFORM_Z } from '../../../config/visual';
import { ART_SCALE } from '../../../iso/art/canvas';
import { tileToScreen } from '../../../iso/coordinates';
import type { AgeId } from '../../../types';
import { projectileMotion, type ProjectilePoint } from '../projectileMotion';

/** Where and how a projectile is drawn at flight fraction t. */
export interface ShotPose {
  /** Ground point under the shot, screen px. */
  readonly gx: number;
  readonly gy: number;
  /** The shot itself, screen px. */
  readonly sx: number;
  readonly sy: number;
  /** Screen-space travel direction (radians). */
  readonly angle: number;
  /** Screen px above its ground point (arc + release height). */
  readonly lift: number;
}

const TANGENT_DT = 0.01;

/**
 * Projectile pose: the ECS arc (projectileMotion) plus a release
 * height that blends from the shooter's hands (`liftFrom` px) to the
 * target's body (`liftTo` px), so shots neither leave from nor land on
 * the units' feet. The angle is the tangent of that drawn curve.
 */
export function shotPose(
  from: ProjectilePoint,
  to: ProjectilePoint,
  t: number,
  arcHeight: number,
  liftFrom: number,
  liftTo: number,
): ShotPose {
  const k = Math.min(1, Math.max(0, t));
  const at = (u: number): { gx: number; gy: number; sx: number; sy: number } => {
    const m = projectileMotion(from, to, u, arcHeight);
    const g = tileToScreen({ tx: m.x, ty: m.y });
    const lift = liftFrom + (liftTo - liftFrom) * u;
    return { gx: g.sx, gy: g.sy, sx: m.sx, sy: m.sy - lift };
  };
  const p = at(k);
  const u0 = Math.max(0, k - TANGENT_DT);
  const u1 = Math.min(1, k + TANGENT_DT);
  const a = at(u0);
  const b = at(u1);
  return { ...p, angle: Math.atan2(b.sy - a.sy, b.sx - a.sx), lift: p.gy - p.sy };
}

/**
 * Camera-shake strength for an impact offset (dx, dy) px from the view
 * centre: `max` at the centre, easing down to `max · edgeKeep` at the
 * view edge, 0 outside the view (only on-screen blasts shake).
 */
export function shakeIntensity(
  dx: number,
  dy: number,
  halfW: number,
  halfH: number,
  max: number,
  edgeKeep: number,
): number {
  if (Math.abs(dx) > halfW || Math.abs(dy) > halfH) return 0;
  const d = Math.min(1, Math.hypot(dx / halfW, dy / halfH));
  return max * (1 - (1 - edgeKeep) * d * d);
}

/**
 * Ground decal opacity at `ageMs`: fully opaque for the first
 * `holdFrac` of its life, then a smooth ease-out fade reaching 0 at
 * `lifeMs`.
 */
export function decalAlpha(ageMs: number, lifeMs: number, holdFrac: number): number {
  if (ageMs >= lifeMs) return 0;
  const hold = lifeMs * holdFrac;
  if (ageMs <= hold) return 1;
  const u = (ageMs - hold) / (lifeMs - hold);
  return 1 - u * u * (3 - 2 * u);
}

/** Frame of a one-shot sequence after `elapsedMs`, or -1 once it has finished. */
export function frameAt(elapsedMs: number, frameMs: number, count: number): number {
  const f = Math.floor(Math.max(0, elapsedMs) / frameMs);
  return f >= count ? -1 : f;
}

/** Screen px above the ground at which a tower of an age style looses its arrows (the archer's bow). */
export function towerLaunchHeight(age: AgeId): number {
  return (TOWER_PLATFORM_Z[age] + 22) / ART_SCALE;
}

/** Release height of a shot: its own (towers) or its kind's default. */
export function releaseLift(shot: { readonly launchHeight?: number }, look: { readonly liftFrom: number }): number {
  return shot.launchHeight ?? look.liftFrom;
}
