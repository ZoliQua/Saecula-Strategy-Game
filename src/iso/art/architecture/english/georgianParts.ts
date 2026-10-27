import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { clockFace, cornice, crest, R } from '../facade';
import { finial, helm } from '../roofs';
import type { ArchStyle } from '../style';

type FaceDraw = (w: number, h: number, light: number) => void;

/*
 * Georgian building parts (English age 3): red brick laid in Flemish
 * bond with pale lime joints, Portland stone quoins, bands and
 * cornices, white six-over-six sashes under gauged-brick flat arches,
 * fanlit doorcases, parapets hiding slate hips, rectangular stacks with
 * clay pots, porticoes and clock cupolas. Face-local helpers draw inside
 * IsoPainter.leftFace / rightFace (x along the wall, y up as negative).
 */

const COURSE = 4.6;
const HEADER = 4.2;
const STRETCHER = 8.8;

/** Flemish bond over a brick face: pale joints, darker burnt headers alternating with stretchers. */
export function flemishBond(p: IsoPainter, w: number, h: number, brick: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(0xe6dccb, light * 0.85), 0.35);
  for (let y = COURSE; y < h; y += COURSE) ctx.fillRect(0, -y, w, 0.75);
  for (let row = 0, y = 0; y < h; row++, y += COURSE) {
    let x = row % 2 ? -(HEADER + STRETCHER) / 2 : 0;
    for (let k = 0; x < w; k++) {
      ctx.fillStyle = css(shade(0xe6dccb, light * 0.85), 0.3);
      ctx.fillRect(x, -y - COURSE, 0.7, COURSE);
      const header = k % 2 === 1;
      const bw = header ? HEADER : STRETCHER;
      const tone = header ? 0.74 + p.random() * 0.1 : 0.92 + p.random() * 0.16;
      ctx.fillStyle = css(shade(header ? 0x7a4a3e : brick, light * tone), header ? 0.75 : 0.45);
      ctx.fillRect(x + 0.7, -y - COURSE + 0.75, bw - 0.7, COURSE - 0.75);
      x += bw;
    }
  }
}

/** Gauged (rubbed) brick flat arch with a stone keystone over an opening x..x+w whose head is at y. */
function flatArch(ctx: Ctx, s: ArchStyle, x: number, y: number, w: number, light: number): void {
  ctx.fillStyle = css(shade(s.palette.brick, light * 1.18));
  ctx.beginPath();
  ctx.moveTo(x - 2.5, y);
  ctx.lineTo(x + w + 2.5, y);
  ctx.lineTo(x + w + 4, y - 5.5);
  ctx.lineTo(x - 4, y - 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(shade(s.palette.brick, light * 0.8), 0.6);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let t = 0.1; t < 1; t += 0.11) {
    const bx = x + w * t;
    ctx.moveTo(bx, y);
    ctx.lineTo(bx + (t - 0.5) * 3, y - 5.5);
  }
  ctx.stroke();
  ctx.fillStyle = css(shade(s.palette.ashlar, light));
  ctx.fillRect(x + w / 2 - 2, y - 6.5, 4, 7);
}

/**
 * Six-over-six sash window (face-local, top-left at x, y): gauged flat
 * arch and keystone, stone sill, white frame and glazing bars over the
 * style's glass; records the dusk glow.
 */
export function sashWindow(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light = 1, arch = true): void {
  const ctx = p.ctx;
  const look = s.palette.window;
  if (arch) flatArch(ctx, s, x, y - 1.2, w, light);
  ctx.fillStyle = 'rgba(28,18,12,.7)';
  ctx.fillRect(x - 1.6, y - 1.2, w + 3.2, h + 2.4);
  ctx.fillStyle = css(shade(look.frame, light));
  ctx.fillRect(x - 1.1, y - 1.1, w + 2.2, h + 2.2);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, css(look.glassTop));
  g.addColorStop(1, css(look.glassBottom));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Reveal shadow along the head and the left jamb.
  ctx.fillStyle = 'rgba(40,24,12,.35)';
  ctx.fillRect(x, y, w, 1.4);
  ctx.fillRect(x, y, 1.1, h);
  ctx.fillStyle = css(shade(look.bars, light), 0.95);
  for (const t of [1 / 3, 2 / 3]) ctx.fillRect(x + w * t - 0.4, y, 0.8, h);
  for (const t of [0.25, 0.75]) ctx.fillRect(x, y + h * t - 0.4, w, 0.8);
  ctx.fillRect(x, y + h / 2 - 0.8, w, 1.6);
  ctx.fillStyle = css(shade(s.palette.ashlar, light * 1.05));
  ctx.fillRect(x - 2.5, y + h + 1, w + 5, 2.4);
  ctx.fillStyle = 'rgba(30,20,12,.35)';
  ctx.fillRect(x - 2.5, y + h + 3.4, w + 5, 1);
  const c = ctx.getTransform().transformPoint(new DOMPoint(x + w / 2, y + h / 2));
  p.addGlow(c.x, c.y, Math.max(w, h));
}

/**
 * Doorcase (face-local, door x..x+w, h tall from the ground): stone
 * step, Tuscan pilasters, entablature and a small pediment, a radial
 * fanlight (glows at dusk) and a six-panel door in `color`.
 */
export function doorcase(p: IsoPainter, s: ArchStyle, x: number, w: number, h: number, color: number, light = 1): void {
  const ctx = p.ctx;
  const trim = css(shade(s.palette.trim, light));
  const fan = w / 2;
  const top = -h - fan;
  ctx.fillStyle = css(shade(s.palette.ashlar, light * 0.95));
  ctx.fillRect(x - 6, -3, w + 12, 3);
  ctx.fillStyle = 'rgba(20,14,10,.8)';
  ctx.fillRect(x - 1, top - 1, w + 2, h + fan + 1);
  ctx.fillStyle = trim;
  for (const px of [x - 4.5, x + w + 1]) ctx.fillRect(px, top - 1, 3.5, h + fan - 2);
  ctx.fillRect(x - 6, top - 5, w + 12, 4);
  ctx.beginPath();
  ctx.moveTo(x - 7, top - 5);
  ctx.lineTo(x + w / 2, top - 5 - Math.max(5, w * 0.35));
  ctx.lineTo(x + w + 7, top - 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(shade(s.palette.trim, light * 0.72));
  ctx.fillRect(x - 6, top - 1.6, w + 12, 0.8);
  // Fanlight.
  const g = ctx.createRadialGradient(x + fan, -h, 0.5, x + fan, -h, fan);
  g.addColorStop(0, css(s.palette.window.glassTop));
  g.addColorStop(1, css(s.palette.window.glassBottom));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, -h);
  ctx.arc(x + fan, -h, fan, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let k = 1; k < 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    ctx.moveTo(x + fan, -h);
    ctx.lineTo(x + fan + Math.cos(a) * fan, -h + Math.sin(a) * fan);
  }
  ctx.stroke();
  const c = ctx.getTransform().transformPoint(new DOMPoint(x + fan, -h - fan / 2));
  p.addGlow(c.x, c.y, fan * 1.6);
  // Six-panel door and a brass knob.
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(x, -h, w, h - 3);
  ctx.strokeStyle = css(shade(color, light * 0.6));
  ctx.lineWidth = 0.7;
  const pw = (w - 3) / 2;
  for (const [py, ph] of [[-h + 2, h * 0.22], [-h + 3 + h * 0.24, h * 0.3], [-h + 4 + h * 0.56, h * 0.33]] as const) {
    ctx.strokeRect(x + 1, py, pw, ph);
    ctx.strokeRect(x + 2 + pw, py, pw, ph);
  }
  ctx.fillStyle = '#e2bd52';
  ctx.fillRect(x + w / 2 - 0.7, -h * 0.5, 1.4, 1.4);
}

export interface BlockOpts {
  /** Stone plinth height (art px); 0 = none. */
  readonly plinth?: number;
  /** Stone band courses, heights above the plinth top (art px). */
  readonly bands?: readonly number[];
  /** Crowning modillion cornice (default true). */
  readonly cornice?: boolean;
  readonly color?: number;
  readonly left?: FaceDraw;
  readonly right?: FaceDraw;
}

/**
 * Georgian brick block: stone plinth, Flemish bond walls, stone quoins
 * (quoins ornament), band courses and a white modillion cornice; `left`
 * / `right` paint openings on the two visible faces.
 */
export function georgianBlock(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, opts: BlockOpts = {}): void {
  const c = s.palette;
  const brick = opts.color ?? c.brick;
  const plinth = opts.plinth ?? 8;
  if (plinth > 0) p.box(u0 - 0.025, v0 - 0.025, u1 + 0.025, v1 + 0.025, z0, z0 + plinth, { color: c.ashlar, detail: 'stone' }, c.ashlar);
  p.box(u0, v0, u1, v1, z0 + plinth, z1, { color: brick });
  const h = z1 - z0 - plinth;
  const face = (light: number, draw: FaceDraw | undefined) => (w: number) => {
    flemishBond(p, w, h, brick, light);
    if (s.ornaments.quoins) stoneQuoins(p.ctx, w, h, c.ashlar, light);
    for (const y of opts.bands ?? []) {
      p.ctx.fillStyle = css(shade(c.ashlar, light * 1.02));
      p.ctx.fillRect(0, -y - 3.2, w, 3.2);
      p.ctx.fillStyle = 'rgba(30,20,12,.3)';
      p.ctx.fillRect(0, -y, w, 0.9);
    }
    if (opts.cornice !== false) modillionCornice(p.ctx, s, w, h, light);
    draw?.(w, h, light);
  };
  p.leftFace(u0, u1, v1, z0 + plinth, face(1, opts.left), h);
  p.rightFace(v0, v1, u1, z0 + plinth, face(R, opts.right), h);
}

/** Slim Portland-stone quoins, long and short stones alternating at both corners of a face. */
export function stoneQuoins(ctx: Ctx, w: number, h: number, color: number, light = 1): void {
  for (let y = 2, i = 0; y < h - 4; y += 6, i++) {
    const qw = i % 2 ? 4 : 7;
    ctx.fillStyle = css(shade(color, light));
    ctx.fillRect(0, -y - 5, qw, 5);
    ctx.fillRect(w - qw, -y - 5, qw, 5);
    ctx.fillStyle = 'rgba(40,28,20,.35)';
    ctx.fillRect(0, -y - 0.6, qw, 0.6);
    ctx.fillRect(w - qw, -y - 0.6, qw, 0.6);
  }
}

/** White crowning cornice with a row of modillion blocks under its soffit (face-local, at the wall top h). */
export function modillionCornice(ctx: Ctx, s: ArchStyle, w: number, h: number, light: number): void {
  cornice(ctx, w, h - 6, s.palette.trim, light, 6);
  ctx.fillStyle = css(shade(s.palette.trim, light * 0.9));
  for (let x = 2; x < w - 2; x += 4.5) ctx.fillRect(x, -h + 6, 2, 2.2);
}

/** Low brick parapet with stone coping on the far ('back') or near ('front') edges of a roof plate. */
export function parapetWall(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z: number, h: number, side: 'back' | 'front'): void {
  const c = s.palette;
  const t = 0.05;
  const wall = { color: c.brick };
  const coping = (a: number, b: number, e: number, f: number) => p.box(a - 0.01, b - 0.01, e + 0.01, f + 0.01, z + h, z + h + 2.5, { color: c.ashlar }, c.ashlar);
  if (side === 'back') {
    p.box(u0, v0, u1, v0 + t, z, z + h, wall, c.brick);
    p.box(u0, v0, u0 + t, v1, z, z + h, wall, c.brick);
    coping(u0, v0, u1, v0 + t);
    coping(u0, v0, u0 + t, v1);
    return;
  }
  p.box(u0, v1 - t, u1, v1, z, z + h, wall, c.brick);
  p.box(u1 - t, v0, u1, v1, z, z + h, wall, c.brick);
  coping(u0, v1 - t, u1, v1);
  coping(u1 - t, v0, u1, v1);
}

/**
 * Rectangular brick chimney stack from z0 to z1 with oversailing
 * courses and `pots` clay chimney pots; records the smoke anchor.
 * Domestic stacks follow the chimneys ornament; forge stacks always stand.
 */
export function georgianStack(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, pots: number, kind: 'domestic' | 'forge' = 'domestic'): void {
  if (kind === 'domestic' && !s.ornaments.chimneys) return;
  const brick = s.palette.stack;
  p.box(u0, v0, u1, v1, z0, z1 - 5, { color: brick, detail: 'brick' }, brick);
  p.box(u0 - 0.025, v0 - 0.025, u1 + 0.025, v1 + 0.025, z1 - 5, z1, { color: shade(brick, 0.85) }, shade(brick, 0.7));
  const alongU = u1 - u0 >= v1 - v0;
  const ctx = p.ctx;
  for (let i = 0; i < pots; i++) {
    const t = (i + 0.5) / pots;
    const [x, y] = p.p(alongU ? u0 + (u1 - u0) * t : (u0 + u1) / 2, alongU ? (v0 + v1) / 2 : v0 + (v1 - v0) * t, z1);
    const g = ctx.createLinearGradient(x - 2.2, 0, x + 2.2, 0);
    g.addColorStop(0, '#c97a4a');
    g.addColorStop(1, '#7a3e22');
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, y - 8, 4, 8);
    ctx.fillRect(x - 2.6, y - 9, 5.2, 1.6);
    ctx.fillStyle = '#1c120c';
    ctx.fillRect(x - 1.6, y - 9.4, 3.2, 0.8);
    p.normalCylinder(x - 2.6, y - 9.4, 5.2, 9.4);
  }
  p.addVolumePoint((u0 + u1) / 2, (v0 + v1) / 2, z1 + 9);
  p.addSmoke((u0 + u1) / 2, (v0 + v1) / 2, z1 + 10);
}

/**
 * Stone portico in front of the +v wall: steps, a row of white columns,
 * entablature and a pediment (a short slate gable whose +v end carries
 * a cornice and the team crest). Returns the pediment apex height.
 */
export function portico(p: IsoPainter, s: ArchStyle, u0: number, u1: number, vWall: number, v1: number, zCol: number, cols: number, rise: number, team: number): number {
  const c = s.palette;
  p.box(u0 - 0.06, vWall, u1 + 0.06, v1 + 0.1, 0, 4, { color: c.ashlar, detail: 'stone' }, c.ashlar);
  p.box(u0 - 0.03, vWall, u1 + 0.03, v1 + 0.04, 4, 8, { color: c.ashlar }, shade(c.ashlar, 1.04));
  const r = Math.min(4.2, ((u1 - u0) * 64) / cols / 3.2);
  for (let i = 0; i < cols; i++) {
    const u = u0 + 0.05 + ((u1 - u0 - 0.1) * i) / (cols - 1);
    columnShaft(p, u, v1 - 0.05, 8, zCol, r, c.trim);
  }
  p.box(u0, vWall, u1, v1, zCol, zCol + 10, { color: c.trim }, c.trim);
  p.leftFace(u0, u1, v1, zCol, (w) => {
    p.ctx.fillStyle = 'rgba(40,30,20,.25)';
    p.ctx.fillRect(0, -4, w, 0.9);
    p.ctx.fillStyle = css(shade(c.trim, 0.82));
    for (let x = 3; x < w; x += 5) p.ctx.fillRect(x, -9.5, 2, 2);
  }, 10);
  p.material = 'slate';
  p.gableRoof(u0, vWall - 0.15, u1, v1, zCol + 10, rise, c.roof, c.trim, 'v', 0.04, (w, rr) => {
    const ctx = p.ctx;
    ctx.strokeStyle = css(shade(c.trim, 0.7));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.lineTo(w / 2, -rr + 3);
    ctx.lineTo(w - 4, -2);
    ctx.closePath();
    ctx.stroke();
    crest(ctx, s, w / 2, -rr * 0.36, rr * 0.22, team);
  });
  return zCol + 10 + rise;
}

/** Tuscan column (white shaft, base and capital) at ground point (u, v). */
export function columnShaft(p: IsoPainter, u: number, v: number, z0: number, z1: number, r: number, color: number): void {
  const ctx = p.ctx;
  const [x, yb] = p.p(u, v, z0);
  const yt = yb - (z1 - z0);
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, css(shade(color, 1.05)));
  g.addColorStop(0.45, css(shade(color, 0.95)));
  g.addColorStop(1, css(shade(color, 0.6)));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, yt, r * 2, yb - yt);
  ctx.fillStyle = css(shade(color, 0.88));
  ctx.fillRect(x - r - 1.2, yt, r * 2 + 2.4, 2.6);
  ctx.fillRect(x - r - 1.2, yb - 2.6, r * 2 + 2.4, 2.6);
  p.normalCylinder(x - r - 1.2, yt, r * 2 + 2.4, yb - yt);
  p.addVolumePoint(u, v, z1);
}

/**
 * Clock cupola on a roof at (u, v, z): white square stage with clock
 * faces, an open arcaded lantern, a lead dome, a gilt ball and the
 * team flag. Returns the top of the dome.
 */
export function cupola(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number, team: number, size = 0.32): number {
  const c = s.palette;
  const h = size / 2;
  const trim = { color: c.trim };
  p.box(u - h, v - h, u + h, v + h, z, z + 18, trim, c.trim);
  p.leftFace(u - h, u + h, v + h, z, (w) => clockFace(p.ctx, w / 2, -9, Math.min(6, w * 0.26)), 18);
  p.rightFace(v - h, v + h, u + h, z, (w) => clockFace(p.ctx, w / 2, -9, Math.min(5.5, w * 0.24)), 18);
  p.box(u - h - 0.02, v - h - 0.02, u + h + 0.02, v + h + 0.02, z + 18, z + 21, trim, c.trim);
  const l = h * 0.78;
  p.box(u - l, v - l, u + l, v + l, z + 21, z + 37, trim, c.trim);
  const arch = (light: number) => (w: number) => {
    p.ctx.fillStyle = css(shade(0x1c1612, light));
    for (const x of [w * 0.22, w * 0.58]) {
      p.ctx.beginPath();
      p.ctx.moveTo(x, -2);
      p.ctx.lineTo(x, -11);
      p.ctx.arc(x + w * 0.1, -11, w * 0.1, Math.PI, 0);
      p.ctx.lineTo(x + w * 0.2, -2);
      p.ctx.fill();
    }
  };
  p.leftFace(u - l, u + l, v + l, z + 21, arch(1), 16);
  p.rightFace(v - l, v + l, u + l, z + 21, arch(R), 16);
  const r = l * 1.05;
  helm(p, u, v, z + 37, [[0, r], [5, r * 0.95], [10, r * 0.7], [14, r * 0.35], [16, r * 0.08]], c.metal);
  finial(p, u, v, z + 53, 9, false);
  p.flag(u, v, z + 60, 18, team);
  return z + 53;
}
