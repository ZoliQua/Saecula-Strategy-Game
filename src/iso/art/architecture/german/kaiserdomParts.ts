import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT, normalize, tileToView } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { dwarfGallery, lombardBand, weathering } from './romanesqueParts';

type Pt = readonly [number, number];
export type Block = readonly [u0: number, v0: number, u1: number, v1: number];

/*
 * Parts of the Kaiserdom (German Wonder): Romanesque walls of red
 * sandstone with pilaster strips (Lisenen), tall round-arched windows,
 * Lombard bands and dwarf galleries; octagonal towers; rhomboid helms
 * (Rautendach: a gable on every face, four diamond roof faces).
 */

/** Colours of the cathedral (Speyer's red and yellow sandstone, slate, copper). */
export interface DomLook {
  readonly stone: number;
  readonly band: number;
  readonly roof: number;
  readonly helm: number;
}

export interface DomWallOpts {
  /** Openings unglazed (a stage under construction): no glow. */
  readonly empty?: boolean;
  /** Crown the wall with a dwarf gallery instead of a Lombard band. */
  readonly gallery?: boolean;
  /** Window rows: sill heights above the wall foot (art px), window height. */
  readonly rows?: ReadonlyArray<readonly [number, number]>;
  /** Unfinished wall top: no crowning band. */
  readonly open?: boolean;
  /** Bay width (art px) between pilaster strips. */
  readonly bay?: number;
  /** Window rows of the left (+v) face where they differ from `rows` ([] where a later block hides the face). */
  readonly leftRows?: ReadonlyArray<readonly [number, number]>;
  /** Span of the left face (fractions of its width) hidden behind later blocks: no windows there, so no glows. */
  readonly leftHidden?: readonly [number, number];
  /** Window span of a face that `domFace` skips (fractions of its width); set per face by domBlock. */
  readonly hidden?: readonly [number, number];
}

/** A Romanesque wall face (face-local): yellow bands, pilaster strips, round-arched windows, crowning band. */
export function domFace(p: IsoPainter, k: DomLook, w: number, h: number, light: number, o: DomWallOpts = {}): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(k.band, light), 0.55);
  for (let y = 16; y < h - 12; y += 26) ctx.fillRect(0, -y, w, 3.2);
  const n = Math.max(1, Math.round(w / (o.bay ?? 22)));
  const pitch = w / n;
  for (let i = 0; i <= n; i++) {
    const x = Math.min(w - 3.5, Math.max(0, i * pitch - 1.75));
    ctx.fillStyle = css(shade(k.stone, light * 1.14));
    ctx.fillRect(x, -h, 3.5, h);
    ctx.fillStyle = 'rgba(30,16,10,.3)';
    ctx.fillRect(x + 3, -h, 0.7, h);
  }
  for (const [sill, wh] of o.rows ?? []) {
    if (sill + wh > h - 6) continue;
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      if (o.hidden && f > o.hidden[0] && f < o.hidden[1]) continue;
      const ww = Math.min(7, pitch * 0.34);
      const x = pitch * (i + 0.5) - ww / 2;
      const y = -sill - wh;
      ctx.fillStyle = css(shade(k.band, light));
      ctx.beginPath();
      ctx.moveTo(x - 1.8, -sill);
      ctx.lineTo(x - 1.8, y + ww / 2);
      ctx.arc(x + ww / 2, y + ww / 2, ww / 2 + 1.8, Math.PI, 0);
      ctx.lineTo(x + ww + 1.8, -sill);
      ctx.fill();
      if (o.empty) {
        ctx.fillStyle = '#1a110c';
        ctx.beginPath();
        ctx.moveTo(x, -sill);
        ctx.lineTo(x, y + ww / 2);
        ctx.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0);
        ctx.lineTo(x + ww, -sill);
        ctx.fill();
      } else p.window(x, y, ww, wh, true);
    }
  }
  if (!o.open) {
    if (o.gallery) dwarfGallery(ctx, w, h - 13, k.stone, light);
    else lombardBand(ctx, w, h - 5, k.stone, light);
  }
  weathering(p, w, h, 0.18);
}

/**
 * A walled block (u0..u1 × v0..v1) from z0 to z1 with dressed visible
 * faces. Windows glow at dusk, so faces that later blocks paint over
 * get no glazed rows there (leftRows / leftHidden).
 */
export function domBlock(p: IsoPainter, k: DomLook, [u0, v0, u1, v1]: Block, z0: number, z1: number, o: DomWallOpts = {}): void {
  p.box(u0, v0, u1, v1, z0, z1, { color: k.stone, detail: 'stone' });
  const left: DomWallOpts = { ...o, rows: o.leftRows ?? o.rows ?? [], ...(o.leftHidden ? { hidden: o.leftHidden } : {}) };
  p.leftFace(u0, u1, v1, z0, (w, h) => domFace(p, k, w, h, 1, left), z1 - z0);
  p.rightFace(v0, v1, u1, z0, (w, h) => domFace(p, k, w, h, R, o), z1 - z0);
}

/** Corners of an octagon of apothem r round (uc, vc); corner k sits between faces k-1 and k. */
function octCorner(uc: number, vc: number, r: number, k: number): readonly [number, number] {
  const a = ((k + 0.5) / 8) * Math.PI * 2;
  const rr = r / Math.cos(Math.PI / 8);
  return [uc + Math.cos(a) * rr, vc + Math.sin(a) * rr];
}

/**
 * Octagonal tower stage from z0 to z1: visible faces back to front, each
 * dressed by `draw` in face-local coordinates (x along the face).
 */
export function octPrism(
  p: IsoPainter,
  uc: number,
  vc: number,
  r: number,
  z0: number,
  z1: number,
  color: number,
  draw?: (w: number, h: number, light: number) => void,
): void {
  const ctx = p.ctx;
  const faces = [0, 1, 2, 3, 4, 5, 6, 7]
    .map((f) => ({ f, du: Math.cos(((f + 1) / 8) * Math.PI * 2), dv: Math.sin(((f + 1) / 8) * Math.PI * 2) }))
    .filter((f) => f.du + f.dv > -0.3)
    .sort((a, b) => a.du + a.dv - (b.du + b.dv));
  for (const { f, du, dv } of faces) {
    const a = octCorner(uc, vc, r, f);
    const b = octCorner(uc, vc, r, f + 1);
    const pts: Pt[] = [p.p(a[0], a[1], z0), p.p(b[0], b[1], z0), p.p(b[0], b[1], z1), p.p(a[0], a[1], z1)];
    const light = baked(0.86 + 0.14 * (dv - du));
    const g = ctx.createLinearGradient(0, pts[2]![1], 0, pts[0]![1]);
    g.addColorStop(0, css(shade(color, light * 1.05)));
    g.addColorStop(1, css(shade(color, light * 0.82)));
    p.fillPoly(pts, g);
    p.normals.fill(pts, normalize(tileToView(du, dv, 0)));
    if (draw) {
      const w = Math.hypot(pts[1]![0] - pts[0]![0], pts[1]![1] - pts[0]![1]);
      ctx.save();
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.clip();
      ctx.setTransform((pts[1]![0] - pts[0]![0]) / w, (pts[1]![1] - pts[0]![1]) / w, 0, 1, pts[0]![0], pts[0]![1]);
      draw(w, z1 - z0, light);
      ctx.restore();
    }
    p.strokePoly(pts, css(shade(color, 0.45), 0.5), 0.8);
  }
  for (let c = 0; c < 8; c += 2) {
    const [u, v] = octCorner(uc, vc, r, c);
    p.addVolumePoint(u, v, z1);
  }
}

/**
 * Rhomboid helm (Rautendach) over a square tower top u0..u1 × v0..v1 at
 * z: a gable of rise `g` on every face and four diamond roof faces
 * meeting at the apex z + `rise`. Returns the apex point.
 */
export function rhombHelm(p: IsoPainter, k: DomLook, [u0, v0, u1, v1]: Block, z: number, g: number, rise: number): Pt {
  const um = (u0 + u1) / 2;
  const vm = (v0 + v1) / 2;
  const apex = p.p(um, vm, z + rise);
  const gl = p.p(um, v1, z + g);
  const gr = p.p(u1, vm, z + g);
  const gb = p.p(um, v0, z + g);
  const gw = p.p(u0, vm, z + g);
  // Gable walls on the two visible faces, each with a pair of belfry lights.
  for (const [pts, n, light] of [
    [[p.p(u0, v1, z), p.p(u1, v1, z), gl], N_LEFT, 1],
    [[p.p(u1, v1, z), p.p(u1, v0, z), gr], N_RIGHT, R],
  ] as const) {
    p.fillPoly([...pts], css(shade(k.stone, light)));
    p.normals.fill([...pts], n);
  }
  p.leftFace(u0, u1, v1, z, (w) => belfry(p, w, g), g);
  p.rightFace(v0, v1, u1, z, (w) => belfry(p, w, g), g);
  const run = (u1 - u0) / 2;
  const faces: Array<[Pt[], number, number, number]> = [
    [[p.p(u1, v0, z), gb, apex, gr], 1, -1, baked(0.8)],
    [[p.p(u0, v1, z), gw, apex, gl], -1, 1, baked(1.02)],
    [[p.p(u1, v1, z), gr, apex, gl], 1, 1, baked(0.9)],
  ];
  const prev = p.material;
  p.material = 'copper';
  for (const [pts, du, dv, light] of faces) {
    const [c, a, top, b] = pts as [Pt, Pt, Pt, Pt];
    p.roofSlope(pts, k.helm, light, p.slope(du * 0.7, dv * 0.7, run, rise - g / 2), (t) => (t < 0.5 ? [lerp(top, a, t * 2), lerp(top, b, t * 2)] : [lerp(a, c, t * 2 - 1), lerp(b, c, t * 2 - 1)]));
  }
  p.material = prev;
  // Pale stone copings on the visible gable rakes: the gables read through the copper.
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(k.band, 1.1));
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  for (const pts of [[p.p(u0, v1, z), gl, p.p(u1, v1, z)], [p.p(u1, v1, z), gr, p.p(u1, v0, z)]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  p.recordRoof(u0, v0, u1, v1, z, [p.p(um, vm, 0)], z + rise);
  return apex;
}

/** Paired round-arched belfry lights in a helm gable of width w and rise g (face-local). */
function belfry(p: IsoPainter, w: number, g: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = '#1a110c';
  for (const x of [w / 2 - 5, w / 2 + 1.5]) {
    ctx.beginPath();
    ctx.moveTo(x, -3);
    ctx.lineTo(x, -g * 0.45);
    ctx.arc(x + 1.75, -g * 0.45, 1.75, Math.PI, 0);
    ctx.lineTo(x + 3.5, -3);
    ctx.fill();
  }
}

/** Gilt cross finial at a canvas point. */
export function crossFinial(p: IsoPainter, [x, y]: Pt, size = 10): void {
  const ctx = p.ctx;
  ctx.fillStyle = '#d9b14a';
  ctx.fillRect(x - 0.9, y - size, 1.8, size);
  ctx.fillRect(x - size * 0.32, y - size * 0.72, size * 0.64, 1.6);
  p.normalCylinder(x - 1, y - size, 2, size);
}
