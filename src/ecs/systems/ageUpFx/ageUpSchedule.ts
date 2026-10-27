import { AGE_STYLED_BUILDINGS } from '../../../iso/art/architecture/ageStyle';
import type { Entity } from '../../components';

/** A building to transform, at its footprint centre (tiles). */
export interface AgeUpTarget<T> {
  readonly item: T;
  readonly tx: number;
  readonly ty: number;
}

/**
 * Start delays for an age-up transformation: buildings nearest the
 * origin (the town centre) go first, then the change ripples outwards,
 * one `staggerMs` apart but never spreading past `maxSpreadMs`.
 */
export function ageUpDelays<T>(
  targets: readonly AgeUpTarget<T>[],
  origin: { tx: number; ty: number },
  timing: { staggerMs: number; maxSpreadMs: number },
): Array<{ item: T; delayMs: number }> {
  const step = targets.length > 1 ? Math.min(timing.staggerMs, timing.maxSpreadMs / (targets.length - 1)) : 0;
  return targets
    .map((t, i) => ({ t, i, d: Math.hypot(t.tx - origin.tx, t.ty - origin.ty) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map(({ t }, rank) => ({ item: t.item, delayMs: rank * step }));
}

/** Ripple origin: the first town centre among the targets, else their centroid. */
export function rippleOrigin<T>(targets: readonly AgeUpTarget<T>[], isOrigin: (item: T) => boolean): { tx: number; ty: number } {
  const tc = targets.find((t) => isOrigin(t.item));
  if (tc) return { tx: tc.tx, ty: tc.ty };
  if (targets.length === 0) return { tx: 0, ty: 0 };
  const sum = targets.reduce((acc, t) => ({ tx: acc.tx + t.tx, ty: acc.ty + t.ty }), { tx: 0, ty: 0 });
  return { tx: sum.tx / targets.length, ty: sum.ty / targets.length };
}

/**
 * Whether a building takes part in the age-up wave: a finished,
 * age-styled one. Walls re-skin silently (a ring of scaffolds per segment
 * would drown the wave); construction sites already show a scaffold and
 * collapsing buildings are on their way out.
 */
export function joinsAgeUpWave(e: Pick<Entity, 'building' | 'dying' | 'underConstruction'>): boolean {
  if (!e.building || e.dying || e.underConstruction) return false;
  return AGE_STYLED_BUILDINGS.includes(e.building.type) && e.building.type !== 'wall';
}
