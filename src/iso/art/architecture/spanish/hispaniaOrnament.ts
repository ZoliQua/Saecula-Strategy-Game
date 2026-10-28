import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { crest } from '../facade';
import { archPath } from '../kits/patio';
import type { ArchStyle } from '../style';
import { kitsOf } from './courtyardKits';

type Pt = readonly [number, number];

/*
 * Face-local ornament of the courtyard families: glazed tile bands,
 * portals (granite voussoirs, a brick alfiz round a horseshoe arch, an
 * ochre plateresque frontispiece), windows with grilles or iron
 * balconies, and the free-standing pieces that crown the silhouettes —
 * espadaña bell gables.
 */

const GLAZE_WHITE = 0xe9e5d6;
const GLAZE_GREEN = 0x2f7a58;
const GLAZE_PURPLE = 0x553b55;
export const BELL = 0xb08a3c;

/** Band of glazed tiles (azulejos) whose top is `top` px above the face's foot. */
export function tileBand(ctx: Ctx, w: number, top: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(GLAZE_WHITE, light));
  ctx.fillRect(0, -top, w, h);
  ctx.fillStyle = css(shade(GLAZE_GREEN, light));
  for (let x = 0; x < w; x += h) {
    ctx.beginPath();
    ctx.moveTo(x, -top + h / 2);
    ctx.lineTo(x + h / 2, -top);
    ctx.lineTo(x + h, -top + h / 2);
    ctx.lineTo(x + h / 2, -top + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = css(shade(GLAZE_PURPLE, light));
  ctx.fillRect(0, -top - 0.8, w, 0.8);
  ctx.fillRect(0, -top + h, w, 0.8);
}

/** Round green-and-white glazed discs (platos) set in brick, as on the Teruel towers. */
export function glazedDiscs(ctx: Ctx, xs: readonly number[], y: number, light: number): void {
  for (const [i, x] of xs.entries()) {
    ctx.fillStyle = css(shade(i % 2 ? GLAZE_GREEN : GLAZE_WHITE, light));
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Door leaves in the owner's colour, studded, under an arch head of `head` px. */
function leaves(ctx: Ctx, x: number, w: number, h: number, team: number, light: number, horseshoe: boolean): void {
  ctx.fillStyle = css(shade(team, 0.78 * light));
  archPath(ctx, x, w, h, horseshoe ? 'horseshoe' : 'round');
  ctx.fill();
  ctx.fillStyle = css(shade(team, 0.5 * light));
  ctx.fillRect(x + w / 2 - 0.6, -h + w / 2, 1.2, h - w / 2);
  ctx.fillStyle = 'rgba(230,200,120,.8)';
  for (let y = -4; y > -h + w / 2 + 2; y -= 5) {
    ctx.fillRect(x + 2, y, 1, 1);
    ctx.fillRect(x + w - 3, y, 1, 1);
  }
}

/**
 * Portal on a face (face-local): the doorway of width w and height h at
 * x, dressed in the age's surround, its leaves in the owner's colour.
 * The plateresque frontispiece carries the crest.
 */
export function portal(p: IsoPainter, s: ArchStyle, x: number, w: number, h: number, team: number, light: number): void {
  const ctx = p.ctx;
  const c = s.palette;
  const k = kitsOf(s);
  if (k.portal === 'alfiz') {
    const out = w + 8;
    ctx.fillStyle = css(shade(c.brick, light * 0.92));
    ctx.fillRect(x - 4, -h - 9, out, h + 9);
    ctx.fillStyle = css(shade(GLAZE_GREEN, light));
    ctx.fillRect(x - 2.5, -h - 7.5, out - 3, h + 7.5);
    ctx.fillStyle = css(shade(c.brick, light * 1.05));
    archPath(ctx, x - 1.5, w + 3, h + 2, 'horseshoe');
    ctx.fill();
    // Alternating voussoirs (red brick and pale stucco).
    ctx.save();
    archPath(ctx, x - 1.5, w + 3, h + 2, 'horseshoe');
    ctx.clip();
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 9) * Math.PI;
      ctx.fillStyle = css(shade(i % 2 ? c.trim : c.brick, light));
      ctx.beginPath();
      ctx.moveTo(x + w / 2, -h + w / 2);
      ctx.arc(x + w / 2, -h + w / 2, w, a, a + Math.PI / 9);
      ctx.fill();
    }
    ctx.restore();
    leaves(ctx, x, w, h - 1, team, light, true);
    return;
  }
  if (k.portal === 'plateresque') {
    const stone = c.plasterDeep;
    ctx.fillStyle = css(shade(stone, light));
    ctx.fillRect(x - 7, -h - 6, w + 14, h + 6);
    ctx.fillRect(x - 9, -h - 10, w + 18, 4);
    // Pilasters, entablature and the crest panel with its curved crown.
    ctx.fillStyle = css(shade(stone, light * 1.15));
    for (const px of [x - 6, x + w + 3]) ctx.fillRect(px, -h - 5, 3, h + 5);
    ctx.fillStyle = css(shade(stone, light));
    ctx.beginPath();
    ctx.moveTo(x - 3, -h - 10);
    ctx.lineTo(x - 3, -h - 20);
    ctx.quadraticCurveTo(x + w / 2, -h - 32, x + w + 3, -h - 20);
    ctx.lineTo(x + w + 3, -h - 10);
    ctx.closePath();
    ctx.fill();
    crest(ctx, s, x + w / 2, -h - 19, 4.6, team);
    ctx.fillStyle = css(shade(stone, light * 0.6));
    ctx.fillRect(x - 9, -h - 6.5, w + 18, 0.8);
    leaves(ctx, x, w, h, team, light, false);
    return;
  }
  // Granite voussoirs round a plain round arch.
  ctx.fillStyle = css(shade(c.ashlar, light));
  archPath(ctx, x - 4, w + 8, h + 4, 'round');
  ctx.fill();
  ctx.strokeStyle = css(shade(c.ashlar, light * 0.62), 0.8);
  ctx.lineWidth = 0.8;
  const r = w / 2 + 4;
  for (let i = 1; i < 7; i++) {
    const a = Math.PI + (i / 7) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + Math.cos(a) * (w / 2), -h + w / 2 + Math.sin(a) * (w / 2));
    ctx.lineTo(x + w / 2 + Math.cos(a) * r, -h + w / 2 + Math.sin(a) * r);
    ctx.stroke();
  }
  leaves(ctx, x, w, h, team, light, false);
}

/** Wrought-iron balcony under a window (face-local): stone slab, railings, a pot of geraniums. */
export function ironBalcony(ctx: Ctx, x: number, y: number, w: number, light: number): void {
  ctx.fillStyle = css(shade(0x9a9080, light));
  ctx.fillRect(x - 4, y, w + 8, 2.4);
  ctx.fillStyle = css(shade(0x6c6458, light), 0.8);
  ctx.fillRect(x - 3, y + 2.4, w + 6, 1.2);
  ctx.fillStyle = '#1f1b1a';
  ctx.fillRect(x - 4, y - 8, w + 8, 1.2);
  for (let bx = x - 3.5; bx <= x + w + 3.5; bx += 2.2) ctx.fillRect(bx, y - 8, 0.8, 8);
  ctx.fillStyle = '#c4362e';
  ctx.fillRect(x + w + 1, y - 10.5, 2.4, 2);
  ctx.fillStyle = '#3e6a2c';
  ctx.fillRect(x + w, y - 9, 4, 1.4);
}

/**
 * Window in the age's manner (face-local): a small square light (age 1),
 * a horseshoe light in its alfiz (age 2), or a tall shuttered casement
 * behind a grille, with an iron balcony on upper storeys (age 3).
 * Records the glow through the painter's window.
 */
export function windowAt(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light: number, upper = false): void {
  const ctx = p.ctx;
  const k = kitsOf(s);
  if (k.portal === 'alfiz') {
    ctx.fillStyle = css(shade(s.palette.trim, light));
    ctx.fillRect(x - 2.5, y - 3, w + 5, h + 4);
    p.window(x, y, w, h, true);
    return;
  }
  if (k.balconies) {
    ctx.fillStyle = css(shade(s.palette.plasterDeep, light));
    ctx.fillRect(x - 2, y - 2.5, w + 4, h + 3.5);
    p.window(x, y, w, h);
    ctx.fillStyle = css(shade(s.palette.shutter, light));
    ctx.fillRect(x - w * 0.42 - 2, y - 1, w * 0.42, h + 1);
    ctx.fillRect(x + w + 2, y - 1, w * 0.42, h + 1);
    if (upper) ironBalcony(ctx, x, y + h, w, light);
    else {
      ctx.fillStyle = 'rgba(25,22,20,.85)';
      for (let bx = x + 1.5; bx < x + w; bx += 2.6) ctx.fillRect(bx, y, 0.8, h);
    }
    return;
  }
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
  p.window(x, y, w, h);
}

/** A bell opening of an espadaña (face-local): centre x, width, crown height and opening height above the base. */
interface BellOpening {
  readonly cx: number;
  readonly bw: number;
  readonly top: number;
  readonly bh: number;
}

/** Outline of a round-headed opening (face-local points, base up). */
function openingOutline(o: BellOpening): Array<[number, number]> {
  const r = o.bw / 2;
  const pts: Array<[number, number]> = [[o.cx - r, -(o.top - o.bh)]];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI + (k / 10) * Math.PI;
    pts.push([o.cx + Math.cos(a) * r, -(o.top - r) + Math.sin(a) * r]);
  }
  pts.push([o.cx + r, -(o.top - o.bh)]);
  return pts;
}

/** Fills polygons as one even-odd path, so the later ones are holes. */
function fillPierced(p: IsoPainter, polys: readonly Pt[][], color: string): void {
  const ctx = p.ctx;
  ctx.beginPath();
  for (const poly of polys) {
    poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  }
  ctx.fillStyle = color;
  ctx.fill('evenodd');
}

/**
 * Espadaña: a bell gable standing on the plane v = vFace (facing +v)
 * from u0 to u1, base at z — a wall pierced by `bells` round-headed
 * openings (one, or two under one) with their bells hanging in them,
 * scrolled shoulders, a cornice and an iron cross. The openings are
 * real holes, so the gable reads pierced against the sky; its thickness
 * shows as a shaded copy behind, offset towards -v.
 */
export function espadana(p: IsoPainter, s: ArchStyle, u0: number, u1: number, vFace: number, z: number, height: number, bells: 1 | 3): void {
  const ctx = p.ctx;
  const w = (u1 - u0) * HW;
  const wall = s.palette.plaster;
  const outer: Array<[number, number]> = [[0, 0], [w, 0], [w, -height * 0.55], [w * 0.86, -height * 0.62], [w * 0.8, -height * 0.84], [w * 0.62, -height * 0.9], [w * 0.56, -height], [w * 0.44, -height], [w * 0.38, -height * 0.9], [w * 0.2, -height * 0.84], [w * 0.14, -height * 0.62], [0, -height * 0.55]];
  const openings: BellOpening[] = bells === 3
    ? [
        { cx: w * 0.27, bw: w * 0.24, top: height * 0.5, bh: height * 0.3 },
        { cx: w * 0.73, bw: w * 0.24, top: height * 0.5, bh: height * 0.3 },
        { cx: w * 0.5, bw: w * 0.2, top: height * 0.84, bh: height * 0.22 },
      ]
    : [{ cx: w * 0.5, bw: w * 0.4, top: height * 0.8, bh: height * 0.38 }];
  // Face-local (x, y) on the plane → canvas point, shifted by (dx, dy).
  const toCanvas = (pts: Array<[number, number]>, dx: number, dy: number): Pt[] =>
    pts.map(([x, y]) => p.p(u0 + x / HW, vFace, z - y)).map(([cx, cy]) => [cx + dx, cy + dy] as const);
  const shapes = (dx: number, dy: number): Pt[][] => [toCanvas(outer, dx, dy), ...openings.map((o) => toCanvas(openingOutline(o), dx, dy))];
  const t = 0.07;
  const back = shapes(t * HW, -t * HW * 0.5);
  fillPierced(p, back, css(shade(wall, 0.62)));
  p.normals.fill(back[0] ?? [], N_RIGHT);
  const front = shapes(0, 0);
  fillPierced(p, front, css(shade(wall, 1.02)));
  p.normals.fill(front[0] ?? [], N_LEFT);
  for (const poly of front) p.strokePoly(poly, css(shade(wall, 0.5), 0.7), 1);
  p.leftFace(u0, u1, vFace, z, () => {
    // Cornice, the bells on their yokes, and the cross.
    ctx.fillStyle = css(shade(s.palette.plasterDeep, 1));
    ctx.fillRect(-1, -height * 0.55 - 2, w + 2, 2.5);
    for (const o of openings) {
      const y0 = -(o.top - o.bw * 0.45);
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(o.cx - o.bw * 0.42, y0 - 1, o.bw * 0.84, 1.4);
      ctx.fillStyle = css(BELL);
      ctx.beginPath();
      ctx.moveTo(o.cx - o.bw * 0.3, y0 + o.bh * 0.55);
      ctx.quadraticCurveTo(o.cx - o.bw * 0.26, y0, o.cx, y0);
      ctx.quadraticCurveTo(o.cx + o.bw * 0.26, y0, o.cx + o.bw * 0.3, y0 + o.bh * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#1e1a18';
    ctx.fillRect(w / 2 - 0.8, -height - 11, 1.6, 11);
    ctx.fillRect(w / 2 - 4, -height - 8, 8, 1.5);
  }, height + 12);
  p.addVolumePoint((u0 + u1) / 2, vFace, z + height + 11);
}

/** Ajimez: a pair of horseshoe lights parted by a marble colonnette, in a brick alfiz (face-local); glows. */
export function ajimez(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(s.palette.trim, light));
  ctx.fillRect(x - 3, y - 3, w + 6, h + 4);
  ctx.fillStyle = css(shade(GLAZE_GREEN, light));
  ctx.fillRect(x - 3, y - 3, w + 6, 1.5);
  const half = (w - 2) / 2;
  p.window(x, y, half, h, true);
  p.window(x + half + 2, y, half, h, true);
  ctx.fillStyle = css(shade(0xefe9dc, light));
  ctx.fillRect(x + half + 0.4, y + 2, 1.2, h - 2);
}

/** A crest on a face at (x, y) (face-local) with a little stone frame. */
export function framedCrest(p: IsoPainter, s: ArchStyle, x: number, y: number, size: number, team: number, light: number): void {
  p.ctx.fillStyle = css(shade(s.palette.ashlar, light));
  p.ctx.fillRect(x - size - 2, y - size - 2, size * 2 + 4, size * 2 + 5);
  crest(p.ctx, s, x, y, size, team);
}
