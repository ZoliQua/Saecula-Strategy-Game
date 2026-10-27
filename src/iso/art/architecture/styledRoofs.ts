import type { IsoPainter } from '../isoPainter';
import { mansardRoof } from './roofs';
import type { ArchStyle } from './style';

type Pt = readonly [number, number];
type GableDetail = (width: number, rise: number) => void;

/*
 * Main roofs in a style's roof profile (style.roof): rises scale with
 * `pitch`, overhangs with `eave`, `form` may force hip or gable, and
 * `material` replaces the painter's cover. With the native profile
 * (pitch 1, eave 1, form 'native', no material) each call paints
 * exactly the IsoPainter / roofs.ts roof it wraps.
 */

function cover(p: IsoPainter, s: ArchStyle): void {
  if (s.roof.material) p.material = s.roof.material;
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
  cover(p, s);
  const r = rise * s.roof.pitch;
  const o = overhang * s.roof.eave;
  if (s.roof.form === 'hip') p.hipRoof(u0, v0, u1, v1, eave, r, color, o);
  else p.gableRoof(u0, v0, u1, v1, eave, r, color, wall, axis, o, detail);
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
  cover(p, s);
  const r = rise * s.roof.pitch;
  const o = overhang * s.roof.eave;
  if (s.roof.form !== 'gable') return p.hipRoof(u0, v0, u1, v1, eave, r, color, o);
  p.gableRoof(u0, v0, u1, v1, eave, r, color, wall, u1 - u0 >= v1 - v0 ? 'u' : 'v', o);
  return p.p((u0 + u1) / 2, (v0 + v1) / 2, eave + r);
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
  cover(p, s);
  const k = s.roof.pitch;
  return mansardRoof(p, u0, v0, u1, v1, eave, lowerRise * k, inset, upperRise * k, color, color, 0.08 * s.roof.eave, s.palette.trim);
}

/** Whether dormers sit on this style's mansards (only on native mansards). */
export function hasDormers(s: ArchStyle): boolean {
  return s.ornaments.dormers && s.roof.form === 'native';
}

/** The gable fill when the style paints boarded gables, else none. */
export function boardedFill(s: ArchStyle, fill: GableDetail): GableDetail | undefined {
  return s.ornaments.boardedGables ? fill : undefined;
}
