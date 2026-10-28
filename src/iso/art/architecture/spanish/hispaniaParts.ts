import type { Ctx } from '../../canvas';
import { lerp } from '../../isoProps';
import type { IsoPainter, WallStyle } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { patioShade } from '../kits/patio';
import type { ArchStyle } from '../style';
import { copingOf, floorOf, kitsOf, wallOf } from './courtyardKits';
import { espadana, tileBand } from './hispaniaOrnament';

type Pt = readonly [number, number];

/*
 * Blocks of the courtyard families (Hispania, Mudéjar, Colonial): walls
 * dressed in the age's finish (whitewash over a red-ochre or ochre
 * plinth, or Toledan bond), flat terraces behind parapets with the shade
 * they cast, stepped merlons, and low hipped tile roofs with a ridge.
 * Whether a block wears a terrace or a hip follows the style's roof
 * profile (`roofOver`).
 */

export type Block = readonly [u0: number, v0: number, u1: number, v1: number];

/** Face painter (face-local, x along the wall, y up as negatives). */
export type FaceDraw = (w: number, h: number) => void;

/** Plinth, Toledan rubble panels and the glazed band of a wall face (face-local). */
export function dress(ctx: Ctx, s: ArchStyle, w: number, h: number, light: number, band = true): void {
  const k = kitsOf(s);
  if (k.walls === 'toledan') {
    // Rubble panels (cajones) between brick courses and piers.
    for (let y = 4; y < h - 8; y += 15) {
      for (let x = 2; x < w - 6; x += 19) {
        ctx.fillStyle = css(shade(s.palette.stone, light * (0.95 + ((x + y) % 3) * 0.04)));
        ctx.fillRect(x, -y - 10, 15, 10);
        ctx.fillStyle = css(shade(s.palette.stone, light * 0.7), 0.6);
        for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * 3.4, -y - 4 - (i % 2) * 4, 2.4, 1.2);
      }
    }
  } else {
    ctx.fillStyle = css(shade(s.palette.plasterDeep, light));
    ctx.fillRect(0, -6, w, 6);
    ctx.fillStyle = css(shade(s.palette.plasterDeep, light * 0.75));
    ctx.fillRect(0, -6.8, w, 0.8);
  }
  if (band && k.tileBands && h > 26) tileBand(ctx, w, h - 7, 4.5, light);
}

/**
 * A block of the courtyard families from z0 to z1, its two visible faces
 * dressed in the age's finish, then handed to the face painters.
 */
export function block(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, z0: number, z1: number, left?: FaceDraw, right?: FaceDraw, band = true): void {
  p.box(u0, v0, u1, v1, z0, z1, wallOf(s), floorOf(s));
  p.leftFace(u0, u1, v1, z0, (w, h) => {
    dress(p.ctx, s, w, h, 1, band);
    left?.(w, h);
  }, z1 - z0);
  p.rightFace(v0, v1, u1, z0, (w, h) => {
    dress(p.ctx, s, w, h, R, band);
    right?.(w, h);
  }, z1 - z0);
}

/** Stepped (Moorish) merlon on a parapet at (u, v, z), `a` tiles wide. */
function merlon(p: IsoPainter, u: number, v: number, z: number, a: number, wall: WallStyle, cap: number): void {
  p.box(u, v, u + a, v + a, z, z + 5, wall, cap);
  p.box(u + a * 0.2, v + a * 0.2, u + a * 0.8, v + a * 0.8, z + 5, z + 8.5, wall, cap);
}

export interface TerraceOpts {
  /** Parapet height (art px); default 7. */
  readonly parapet?: number;
  /** Stepped merlons on the parapet; default from the style's kits. */
  readonly merlons?: boolean;
  /** Parapet colour where it is not the age's wall finish (the Alhambra's red tapial). */
  readonly color?: number;
}

/**
 * Flat roof (azotea) on a block's top at z: the terrace floor, the shade
 * the back parapets cast on it, coped parapets on all four edges (back
 * ones first, so their inner faces show), stepped merlons where the age
 * has them and clay spouts through the front parapets.
 */
export function terrace(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, z: number, o: TerraceOpts = {}): void {
  const h = o.parapet ?? 7;
  const t = 0.05;
  const wall = { color: o.color ?? wallOf(s).color };
  const cap = o.color === undefined ? copingOf(s) : shade(o.color, 1.08);
  const crenel = o.merlons ?? kitsOf(s).merlons;
  p.ground(u0, v0, u1, v1, floorOf(s), z);
  p.box(u0, v0, u1, v0 + t, z, z + h, wall, cap);
  p.box(u0, v0, u0 + t, v1, z, z + h, wall, cap);
  patioShade(p, u0 + t, v0 + t, u1, v1, z, Math.min(0.16, (u1 - u0) * 0.3), 0.5);
  const a = 0.075;
  const step = 0.17;
  if (crenel) {
    for (let u = u0 + 0.02; u + a < u1 - 0.02; u += step) merlon(p, u, v0 - 0.01, z + h, a, wall, cap);
    for (let v = v0 + step; v + a < v1 - 0.02; v += step) merlon(p, u0 - 0.01, v, z + h, a, wall, cap);
  }
  p.box(u0, v1 - t, u1, v1, z, z + h, wall, cap);
  p.box(u1 - t, v0, u1, v1, z, z + h, wall, cap);
  if (crenel) {
    for (let u = u0 + 0.02; u + a < u1 - 0.02; u += step) merlon(p, u, v1 - a + 0.01, z + h, a, wall, cap);
    for (let v = v0 + 0.02; v + a < v1 - a; v += step) merlon(p, u1 - a + 0.01, v, z + h, a, wall, cap);
  }
  // Clay spouts (gárgolas) through the two front parapets.
  const ctx = p.ctx;
  ctx.strokeStyle = '#8a4a2c';
  ctx.lineWidth = 2;
  const spouts: Array<[Pt, Pt]> = [
    [p.p((u0 + u1) / 2, v1, z + 2), p.p((u0 + u1) / 2, v1 + 0.1, z + 1)],
    [p.p(u1, (v0 + v1) / 2, z + 2), p.p(u1 + 0.1, (v0 + v1) / 2, z + 1)],
  ];
  for (const [a0, a1] of spouts) {
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.lineTo(a1[0], a1[1]);
    ctx.stroke();
  }
  p.addVolumePoint(u1, v1, z + h + (crenel ? 8.5 : 0));
  p.addVolumePoint(u0, v0, z + h + (crenel ? 8.5 : 0));
}

/**
 * Low hipped tile roof with a ridge along the block's longer side (a
 * pyramid on square blocks), rise scaled by the style's pitch.
 */
export function hip(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, eave: number, rise: number, color = s.palette.roof, o = 0.09): Pt {
  const r = rise * s.roof.pitch;
  const prev = p.material;
  p.material = s.roof.material ?? 'tile';
  const top = eave + r;
  const A = p.p(u0 - o, v0 - o, eave);
  const B = p.p(u1 + o, v0 - o, eave);
  const C = p.p(u1 + o, v1 + o, eave);
  const D = p.p(u0 - o, v1 + o, eave);
  const alongU = u1 - u0 >= v1 - v0;
  const run = (alongU ? v1 - v0 : u1 - u0) / 2 + o;
  const um = (u0 + u1) / 2;
  const vm = (v0 + v1) / 2;
  const r0 = alongU ? [Math.min(um, u0 - o + run), vm] as const : [um, Math.min(vm, v0 - o + run)] as const;
  const r1 = alongU ? [Math.max(um, u1 + o - run), vm] as const : [um, Math.max(vm, v1 + o - run)] as const;
  const R0 = p.p(r0[0], r0[1], top);
  const R1 = p.p(r1[0], r1[1], top);
  const back: Pt[] = alongU ? [A, B, R1, R0] : [A, B, R0];
  const leftEnd: Pt[] = alongU ? [D, A, R0] : [D, A, R0, R1];
  p.fillPoly(back, css(shade(color, baked(0.82))));
  p.normals.fill(back, p.slope(0, -1, run, r));
  p.fillPoly(leftEnd, css(shade(color, baked(0.92))));
  p.normals.fill(leftEnd, p.slope(-1, 0, run, r));
  const front: Pt[] = alongU ? [D, C, R1, R0] : [D, C, R1];
  const rightEnd: Pt[] = alongU ? [C, B, R1] : [C, B, R0, R1];
  p.roofSlope(front, color, baked(1.05), p.slope(0, 1, run, r), (t) => [lerp(D, alongU ? R0 : R1, 1 - t), lerp(C, R1, 1 - t)]);
  p.roofSlope(rightEnd, color, baked(0.76), p.slope(1, 0, run, r), (t) => [lerp(C, R1, 1 - t), lerp(B, alongU ? R1 : R0, 1 - t)]);
  p.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, [p.p(r0[0], r0[1], 0), p.p(r1[0], r1[1], 0)], top);
  // Ridge and hip tiles.
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(color, 1.25));
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(R0[0], R0[1]);
  ctx.lineTo(R1[0], R1[1]);
  ctx.moveTo(C[0], C[1]);
  ctx.lineTo(R1[0], R1[1]);
  ctx.moveTo(D[0], D[1]);
  ctx.lineTo((alongU ? R0 : R1)[0], (alongU ? R0 : R1)[1]);
  ctx.stroke();
  p.material = prev;
  return R1;
}

/** Roof of a dwelling block: a terrace behind its parapet, or a low hip where the style forces hips. Returns the top. */
export function roofOver(p: IsoPainter, s: ArchStyle, b: Block, z: number, rise = 22, terraceOpts?: TerraceOpts): number {
  if (s.roof.form === 'hip') {
    hip(p, s, b, z, rise);
    return z + rise * s.roof.pitch;
  }
  terrace(p, s, b, z, terraceOpts);
  return z + (terraceOpts?.parapet ?? 7);
}

/** Roof of a hall (barracks, stable, curia): always low tile, the age's hip over the long side. */
export function hallRoof(p: IsoPainter, s: ArchStyle, b: Block, z: number, rise = 26): number {
  hip(p, s, b, z, rise);
  return z + rise * s.roof.pitch;
}

/**
 * Espadaña crowning a hipped block's ridge (Colonial reading only): a
 * bell gable across the middle of the ridge, so it stands on the
 * building's skyline. Nothing on terraces or where the age has none.
 */
export function ridgeBells(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, eave: number, rise: number, height: number, bells: 1 | 3 = 1): void {
  if (!kitsOf(s).espadanas || s.roof.form !== 'hip') return;
  const um = (u0 + u1) / 2;
  const half = Math.min(0.32, (u1 - u0) * 0.3) * (bells === 3 ? 1.5 : 1);
  espadana(p, s, um - half, um + half, (v0 + v1) / 2, eave + rise * s.roof.pitch - 4, height, bells);
}
