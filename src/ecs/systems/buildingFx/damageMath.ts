import type { VolumePoint } from '../../../iso/art/lighting/shadowGeometry';

/** 0 = intact, 1 = smoking + cracked, 2 = burning. */
export type DamageStage = 0 | 1 | 2;

/** Damage look for a building at `current` / `max` HP. */
export function damageStage(current: number, max: number, smokeBelow: number, fireBelow: number): DamageStage {
  if (max <= 0 || current <= 0) return 0;
  const f = current / max;
  if (f < fireBelow) return 2;
  if (f < smokeBelow) return 1;
  return 0;
}

/** World px offset from a building sprite's anchor (front corner). */
export type Offset = readonly [number, number];

/**
 * Where flames sit on a building: up to `count` points spread over the
 * top of its painted volume (roof eaves, ridges, tower tops), pulled a
 * little towards their centre so they sit on the roof rather than hang
 * off its corners. `volume` is in texture px (IsoPainter), the anchor is
 * at (anchorX, anchorY) texture px and the texture is drawn at
 * 1 / artScale. Falls back to `fallback` when there is no volume.
 */
export function fireAnchors(
  volume: readonly VolumePoint[],
  anchorX: number,
  anchorY: number,
  artScale: number,
  count: number,
  fallback: Offset,
): Offset[] {
  const tops = volume.filter((p) => p.z > 0).map((p): Offset => [(p.gx - anchorX) / artScale, (p.gy - p.z - anchorY) / artScale]);
  if (tops.length === 0 || count <= 0) return count > 0 ? [fallback] : [];
  const highest = Math.min(...tops.map((t) => t[1]));
  const lowest = Math.max(...tops.map((t) => t[1]));
  // Upper part of the volume only: roofs, not the eaves of a low lean-to.
  const cut = highest + (lowest - highest) * 0.6;
  const pool = tops.filter((t) => t[1] <= cut);
  const picked: Offset[] = [pool.reduce((a, b) => (b[1] < a[1] ? b : a))];
  while (picked.length < count && picked.length < pool.length) {
    let best: Offset | null = null;
    let bestD = -1;
    for (const p of pool) {
      const d = Math.min(...picked.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best || bestD < 4) break;
    picked.push(best);
  }
  const cx = pool.reduce((s, p) => s + p[0], 0) / pool.length;
  const cy = pool.reduce((s, p) => s + p[1], 0) / pool.length;
  return picked.map(([x, y]): Offset => [x + (cx - x) * 0.3, y + (cy - y) * 0.3]);
}

/** Look of a collapsing building at progress t (0 = struck down, 1 = gone). */
export interface CollapsePose {
  /** Fraction of the sprite's height sunk below the ground line. */
  readonly sink: number;
  /** Sideways shudder, world px. */
  readonly dx: number;
  /** Lean, radians (about the ground anchor). */
  readonly rotation: number;
  readonly alpha: number;
  /** 0..1 darkening towards dust / soot. */
  readonly darken: number;
}

const SHUDDER_END = 0.16;
const MAX_SINK = 0.9;
const MAX_LEAN = 0.05;
const FADE_FROM = 0.78;

/**
 * Collapse: a short shudder, then the building gives way, sinking ever
 * faster into its own dust with a slight lean (`leanSign` ±1), going
 * dark and fading out at the end.
 */
export function collapsePose(t: number, leanSign: number): CollapsePose {
  const k = Math.min(1, Math.max(0, t));
  const shudder = k < SHUDDER_END ? Math.sin(k * 140) * 1.6 * (1 - k / SHUDDER_END) : 0;
  const u = Math.max(0, (k - SHUDDER_END * 0.6) / (1 - SHUDDER_END * 0.6));
  const fall = u * u * (1.6 - 0.6 * u);
  return {
    sink: MAX_SINK * fall,
    dx: shudder,
    rotation: leanSign * MAX_LEAN * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5),
    alpha: k < FADE_FROM ? 1 : Math.max(0, 1 - (k - FADE_FROM) / (1 - FADE_FROM)),
    darken: Math.min(1, k * 1.5),
  };
}

/** Collapse progress 0..1 from a dying building's remaining time. */
export function collapseProgress(ttlMs: number, totalMs: number): number {
  if (totalMs <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - ttlMs / totalMs));
}

/** Shadow height of a collapsing building (follows the sink). */
export function collapseHeightScale(ttlMs: number, totalMs: number): number {
  return Math.max(0, 1 - collapsePose(collapseProgress(ttlMs, totalMs), 1).sink);
}

/**
 * Rubble decal opacity `ageMs` after the collapse began: it shows
 * through the dust as the building sinks (fully there by the time the
 * building is gone), holds, then fades out by `lifeMs` after the
 * building went down.
 */
export function rubbleAlpha(ageMs: number, collapseMs: number, lifeMs: number, holdFrac: number): number {
  if (ageMs < collapseMs) {
    const k = Math.max(0, (ageMs / collapseMs - 0.25) / 0.6);
    return Math.min(1, k);
  }
  const after = ageMs - collapseMs;
  if (after >= lifeMs) return 0;
  const hold = lifeMs * holdFrac;
  if (after <= hold) return 1;
  const v = (after - hold) / (lifeMs - hold);
  return 1 - v * v * (3 - 2 * v);
}

/** True when a tool swing has just reached its striking frame. */
export function isStrike(prevFrame: number | undefined, frame: number, strikeFrame: number): boolean {
  return frame === strikeFrame && prevFrame !== strikeFrame;
}

/** Indices of the `cap` items nearest (cx, cy) (all when there are fewer). */
export function nearestIndices(points: ReadonlyArray<{ readonly x: number; readonly y: number }>, cx: number, cy: number, cap: number): Set<number> {
  const order = points.map((p, i) => [i, Math.hypot(p.x - cx, p.y - cy)] as const).sort((a, b) => a[1] - b[1]);
  return new Set(order.slice(0, Math.max(0, cap)).map(([i]) => i));
}
