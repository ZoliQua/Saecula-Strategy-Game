import type { Entity } from '../ecs/components';
import { flightDurationMs } from '../ecs/systems/projectileMotion';
import { entityPoint, type Point } from './targetGeometry';

type Positioned = Entity & { position: { tx: number; ty: number } };

/** Fixed-point passes for the aim point; 3 converge well below the hit radius. */
const LEAD_ITERATIONS = 3;

/**
 * Where an entity will be `aheadMs` from now if it keeps following its
 * current path. Mirrors MovementSystem: every path step takes
 * 1 / speed seconds whatever its length, starting from the current
 * progress. Buildings and idle units stay put; the walk ends at the
 * last path tile.
 */
export function predictPoint(e: Positioned, aheadMs: number): Point {
  const mv = e.movable;
  if (e.building || !mv || mv.path.length === 0 || mv.speed <= 0) return entityPoint(e);
  let steps = (mv.speed * aheadMs) / 1000;
  let fromX = e.position.tx;
  let fromY = e.position.ty;
  let k = Math.min(1, Math.max(0, mv.progress));
  for (const next of mv.path) {
    const left = 1 - k;
    if (steps <= left) {
      const t = k + steps;
      return { x: fromX + (next.tx - fromX) * t, y: fromY + (next.ty - fromY) * t };
    }
    steps -= left;
    fromX = next.tx;
    fromY = next.ty;
    k = 0;
  }
  return { x: fromX, y: fromY };
}

/**
 * Aim point for a projectile from `from` at `speed` tiles/s: the
 * target's predicted position after the flight time to that point
 * (solved by a few fixed-point passes). A target that changes course
 * mid-flight can still be missed — that is intended.
 */
export function leadTargetPoint(from: Point, e: Positioned, speed: number, minFlightMs: number): Point {
  let p = entityPoint(e);
  if (!e.movable || e.movable.path.length === 0) return p;
  for (let i = 0; i < LEAD_ITERATIONS; i++) {
    const ms = flightDurationMs(Math.hypot(p.x - from.x, p.y - from.y), speed, minFlightMs);
    p = predictPoint(e, ms);
  }
  return p;
}
