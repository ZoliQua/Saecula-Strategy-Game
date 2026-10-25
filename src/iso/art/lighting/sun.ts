import { MIN_BRIGHTNESS, SHADOW, SKY_KEYS, type SkyKey } from '../../../config/visual';
import { normalize, SCREEN_PER_WORLD_DEPTH, SCREEN_PER_WORLD_HEIGHT, worldToView, type Vec3 } from './viewSpace';

/** Everything the renderer needs to know about the sky at one moment. */
export interface SunState {
  /** Cycle phase 0..1. */
  readonly phase: number;
  readonly elevationDeg: number;
  readonly azimuthDeg: number;
  /** Unit vector towards the sun, view space. */
  readonly dir: Vec3;
  /** Sun colour × intensity. */
  readonly color: Vec3;
  /** Ambient colour, already lifted to respect MIN_BRIGHTNESS. */
  readonly ambient: Vec3;
  /** Window glow 0..1. */
  readonly glow: number;
  /** 0 = full day … 1 = full night (drives torch strength). */
  readonly night: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp3(a: readonly number[], b: readonly number[], t: number): Vec3 {
  return [lerp(a[0] ?? 0, b[0] ?? 0, t), lerp(a[1] ?? 0, b[1] ?? 0, t), lerp(a[2] ?? 0, b[2] ?? 0, t)];
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Wraps any number into [0, 1). */
export function wrapPhase(p: number): number {
  return ((p % 1) + 1) % 1;
}

/** The two keyframes around `phase` and the (eased) blend between them. */
function bracket(keys: readonly SkyKey[], phase: number): { a: SkyKey; b: SkyKey; t: number } {
  const n = keys.length;
  for (let i = 0; i < n; i++) {
    const a = keys[i]!;
    const b = keys[(i + 1) % n]!;
    const end = i + 1 < n ? b.at : b.at + 1;
    if (phase >= a.at && phase < end) return { a, b, t: smooth((phase - a.at) / (end - a.at)) };
  }
  // phase before the first key: blend last → first across the wrap.
  const a = keys[n - 1]!;
  const b = keys[0]!;
  const span = b.at + 1 - a.at;
  return { a, b, t: smooth((phase + 1 - a.at) / span) };
}

/** Light reaching flat ground: ambient + sun·max(sin(elevation), 0). */
export function groundBrightness(ambient: Vec3, color: Vec3, elevationDeg: number): number {
  const lambert = Math.max(0, Math.sin((elevationDeg * Math.PI) / 180));
  const lum = (c: Vec3) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
  return lum(ambient) + lum(color) * lambert;
}

/** Unit view-space vector towards a sun at (azimuth, elevation) degrees. */
export function sunDirection(azimuthDeg: number, elevationDeg: number): Vec3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const h = Math.cos(el);
  return normalize(worldToView(Math.cos(az) * h, Math.sin(az) * h, Math.sin(el)));
}

/** Samples the sky keyframes at a cycle phase. */
export function sunAt(phase: number, keys: readonly SkyKey[] = SKY_KEYS): SunState {
  const p = wrapPhase(phase);
  const { a, b, t } = bracket(keys, p);
  const elevationDeg = lerp(a.elevation, b.elevation, t);
  const azimuthDeg = lerp(a.azimuth, b.azimuth, t);
  const color = lerp3(a.sun, b.sun, t);
  let ambient = lerp3(a.ambient, b.ambient, t);
  const bright = groundBrightness(ambient, color, elevationDeg);
  if (bright < MIN_BRIGHTNESS) {
    const lift = MIN_BRIGHTNESS - bright;
    ambient = [ambient[0] + lift, ambient[1] + lift, ambient[2] + lift];
  }
  const glow = lerp(a.glow, b.glow, t);
  return {
    phase: p,
    elevationDeg,
    azimuthDeg,
    dir: sunDirection(azimuthDeg, elevationDeg),
    color,
    ambient,
    glow,
    night: Math.min(1, glow),
  };
}

/** Screen-space shadow offset per pixel of painted height (y down). */
export interface ShadowVector {
  readonly x: number;
  readonly y: number;
  /** Screen vector of one px across the shadow (perpendicular, on the ground). */
  readonly px: number;
  readonly py: number;
  /** Shadow opacity multiplier 0..1 (fades with weak / low sun). */
  readonly strength: number;
}

/**
 * Where a point painted `h` px above its ground point casts its shadow:
 * ground point + h·(x, y). Opposite the sun horizontally, longer as the
 * sun gets lower, capped at SHADOW.maxLength.
 */
export function shadowVector(sun: Pick<SunState, 'azimuthDeg' | 'elevationDeg' | 'color'>): ShadowVector {
  const el = (Math.max(1, sun.elevationDeg) * Math.PI) / 180;
  const az = (sun.azimuthDeg * Math.PI) / 180;
  const len = Math.min(SHADOW.maxLength, 1 / (SCREEN_PER_WORLD_HEIGHT * Math.tan(el)));
  const intensity = (sun.color[0] + sun.color[1] + sun.color[2]) / 3;
  // Long grazing shadows soften out; a dim sun barely casts any.
  const grazing = Math.min(1, sun.elevationDeg / 10);
  // Perpendicular on the ground, oriented to keep screen-x positive.
  let px = -Math.sin(az);
  let py = Math.cos(az) * SCREEN_PER_WORLD_DEPTH;
  if (px < 0) {
    px = -px;
    py = -py;
  }
  return {
    x: -Math.cos(az) * len,
    y: -Math.sin(az) * SCREEN_PER_WORLD_DEPTH * len,
    px,
    py,
    strength: Math.max(0, Math.min(1, intensity / 0.55)) * Math.max(0.25, grazing),
  };
}
