import type { IsoPainter, WallStyle } from '../isoPainter';
import { chimney } from './parts';
import { mansardRoof } from './roofs';
import type { ArchStyle } from './style';

type Pt = readonly [number, number];
type GableDetail = (width: number, rise: number) => void;

/*
 * Main roofs in a style's roof profile (style.roof): rises scale with
 * `pitch`, overhangs with `eave`, `form` may force hip or gable, and
 * `material` replaces the painter's cover. With the native profile
 * (pitch 1, eave 1, form 'native', no material) each call paints
 * exactly the IsoPainter / roofs.ts roof it wraps. Anything standing
 * on or through a main roof (chimneys, cupolas, dormers, vents) takes
 * its height from roofLift / onRoof so it moves with the pitch.
 */

/** Paints with the style's roof material, then restores the painter's own (no leak into later roofs). */
function withCover<T>(p: IsoPainter, s: ArchStyle, paint: () => T): T {
  const prev = p.material;
  if (s.roof.material) p.material = s.roof.material;
  const out = paint();
  p.material = prev;
  return out;
}

/** How much higher the top of a main roof of native `rise` stands at the style's pitch (0 at pitch 1). */
export function roofLift(s: ArchStyle, rise: number): number {
  return rise * (s.roof.pitch - 1);
}

/** A height `z` on a main roof's slope (eave → eave + native rise), moved with the style's pitch. */
export function onRoof(s: ArchStyle, eave: number, z: number): number {
  return eave + (z - eave) * s.roof.pitch;
}

/**
 * Chimney stack through a main roof of native `rise`: its top and smoke
 * anchor rise with the roof's pitch, so it always clears the ridge it
 * cleared at pitch 1. Domestic chimneys follow the chimneys ornament;
 * forge and furnace stacks always stand.
 */
export function roofChimney(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  z0: number,
  z1: number,
  rise: number,
  wall: WallStyle,
  kind: 'domestic' | 'forge' = 'domestic',
): void {
  if (kind === 'domestic' && !s.ornaments.chimneys) return;
  chimney(p, u0, v0, u1, v1, z0, z1 + roofLift(s, rise), wall);
}

/** Gable roof (ridge along `axis`), or a hip when the style forces hips. */
export function styledGable(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  eave: number,
  rise: number,
  color: number,
  wall: number,
  axis: 'u' | 'v',
  overhang = 0.12,
  detail?: GableDetail,
): void {
  const r = rise * s.roof.pitch;
  const o = overhang * s.roof.eave;
  withCover(p, s, () => {
    if (s.roof.form === 'hip') p.hipRoof(u0, v0, u1, v1, eave, r, color, o);
    else p.gableRoof(u0, v0, u1, v1, eave, r, color, wall, axis, o, detail);
  });
}

/** Hip roof, or a gable along the longer side when the style forces gables. Returns the apex / ridge top. */
export function styledHip(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  eave: number,
  rise: number,
  color: number,
  overhang = 0.12,
  wall = s.palette.plaster,
): Pt {
  const r = rise * s.roof.pitch;
  const o = overhang * s.roof.eave;
  return withCover(p, s, () => {
    if (s.roof.form !== 'gable') return p.hipRoof(u0, v0, u1, v1, eave, r, color, o);
    p.gableRoof(u0, v0, u1, v1, eave, r, color, wall, u1 - u0 >= v1 - v0 ? 'u' : 'v', o);
    return p.p((u0 + u1) / 2, (v0 + v1) / 2, eave + r);
  });
}

/** Mansard roof (roofs.ts), or a plain hip / gable of the same height when the style forces a form. */
export function styledMansard(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  eave: number,
  lowerRise: number,
  inset: number,
  upperRise: number,
  color: number,
): Pt {
  if (s.roof.form !== 'native') return styledHip(p, s, u0, v0, u1, v1, eave, lowerRise + upperRise, color, 0.08);
  const k = s.roof.pitch;
  return withCover(p, s, () => mansardRoof(p, u0, v0, u1, v1, eave, lowerRise * k, inset, upperRise * k, color, color, 0.08 * s.roof.eave, s.palette.trim));
}

/** Whether dormers sit on this style's mansards (only on native mansards). */
export function hasDormers(s: ArchStyle): boolean {
  return s.ornaments.dormers && s.roof.form === 'native';
}

/** The gable fill when the style paints boarded gables, else none. */
export function boardedFill(s: ArchStyle, fill: GableDetail): GableDetail | undefined {
  return s.ornaments.boardedGables ? fill : undefined;
}
