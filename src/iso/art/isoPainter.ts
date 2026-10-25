import { TILE_HEIGHT, TILE_WIDTH } from '../../config/constants';
import { ART_SCALE, BUILDING_BOTTOM_PAD, makeCanvas, poly, type Ctx } from './canvas';
import { css, rng, shade } from './palette';

/** Half tile extents at art resolution. */
export const HW = (TILE_WIDTH / 2) * ART_SCALE;
export const HH = (TILE_HEIGHT / 2) * ART_SCALE;

type Pt = readonly [number, number];

export interface WallStyle {
  readonly color: number;
  /** Optional decoration painted in face-local coordinates. */
  readonly detail?: 'stone' | 'plaster' | 'planks' | 'logs' | 'brick';
}

/**
 * Paints isometric volumes onto a canvas. World axes:
 *   u — along tile x (screen down-right), v — along tile y (screen
 *   down-left), z — up, in art pixels. The footprint's front corner
 *   (u=w, v=h, z=0) sits at the bottom centre of the canvas.
 * Light comes from the upper left, so faces looking towards +v are
 * lit and faces looking towards +u are in shade.
 */
export class IsoPainter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: Ctx;
  readonly cx: number;
  readonly by: number;
  private readonly rand: () => number;

  constructor(
    readonly w: number,
    readonly h: number,
    readonly maxHeight: number,
    seed: number,
  ) {
    const width = (w + h) * HW + 24;
    const height = (w + h) * HH + maxHeight + BUILDING_BOTTOM_PAD + 8;
    const { canvas, ctx } = makeCanvas(width, height);
    this.canvas = canvas;
    this.ctx = ctx;
    this.cx = canvas.width / 2;
    this.by = canvas.height - BUILDING_BOTTOM_PAD;
    this.rand = rng(seed);
  }

  random(): number {
    return this.rand();
  }

  p(u: number, v: number, z: number): Pt {
    return [
      this.cx + (u - this.w - (v - this.h)) * HW,
      this.by - (this.w + this.h - u - v) * HH - z,
    ];
  }

  fillPoly(pts: Pt[], color: string | CanvasGradient): void {
    poly(this.ctx, pts);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  strokePoly(pts: Pt[], color: string, width = 1.5): void {
    poly(this.ctx, pts);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
  }

  /** Flat ground plate (foundation, yard, field). */
  ground(u0: number, v0: number, u1: number, v1: number, color: number, z = 0): Pt[] {
    const pts = [this.p(u0, v0, z), this.p(u1, v0, z), this.p(u1, v1, z), this.p(u0, v1, z)];
    this.fillPoly(pts, css(color));
    return pts;
  }

  /** Axis-aligned box; returns the three visible face polygons. */
  box(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    z0: number,
    z1: number,
    wall: WallStyle,
    top?: number,
  ): { left: Pt[]; right: Pt[]; top: Pt[] } {
    const left = [this.p(u0, v1, z0), this.p(u1, v1, z0), this.p(u1, v1, z1), this.p(u0, v1, z1)];
    const right = [this.p(u1, v1, z0), this.p(u1, v0, z0), this.p(u1, v0, z1), this.p(u1, v1, z1)];
    const topPts = [this.p(u0, v0, z1), this.p(u1, v0, z1), this.p(u1, v1, z1), this.p(u0, v1, z1)];

    this.fillPoly(left, this.faceGradient(left, wall.color, 1.0));
    this.fillPoly(right, this.faceGradient(right, wall.color, 0.72));
    if (wall.detail) {
      this.leftFace(u0, u1, v1, z0, (w, hgt) => this.wallDetail(wall, w, hgt, 1.0), z1 - z0);
      this.rightFace(v0, v1, u1, z0, (w, hgt) => this.wallDetail(wall, w, hgt, 0.72), z1 - z0);
    }
    if (top !== undefined) this.fillPoly(topPts, css(shade(top, 1.1)));
    // Crisp edges read well at small zoom.
    this.strokePoly(left, css(shade(wall.color, 0.45), 0.55), 1.2);
    this.strokePoly(right, css(shade(wall.color, 0.35), 0.55), 1.2);
    return { left, right, top: topPts };
  }

  private faceGradient(pts: Pt[], color: number, light: number): CanvasGradient {
    const ys = pts.map((p) => p[1]);
    const g = this.ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, css(shade(color, light * 1.06)));
    g.addColorStop(0.75, css(shade(color, light * 0.96)));
    g.addColorStop(1, css(shade(color, light * 0.7)));
    return g;
  }

  /**
   * Runs `draw` with the context mapped onto the +v facing wall, so
   * the callback paints in face-local pixels: x along the wall
   * (0..width), y up the wall as negative values (0..-height).
   */
  leftFace(
    u0: number,
    u1: number,
    v: number,
    z0: number,
    draw: (width: number, height: number) => void,
    height = 0,
  ): void {
    const [ox, oy] = this.p(u0, v, z0);
    const width = (u1 - u0) * HW;
    this.withTransform(1, 0.5, ox, oy, height, width, draw, [
      this.p(u0, v, z0),
      this.p(u1, v, z0),
      this.p(u1, v, z0 + (height > 0 ? height : 999)),
      this.p(u0, v, z0 + (height > 0 ? height : 999)),
    ]);
  }

  /** Same as leftFace but for the +u facing wall (x runs from front to back). */
  rightFace(
    v0: number,
    v1: number,
    u: number,
    z0: number,
    draw: (width: number, height: number) => void,
    height = 0,
  ): void {
    const [ox, oy] = this.p(u, v1, z0);
    const width = (v1 - v0) * HW;
    this.withTransform(1, -0.5, ox, oy, height, width, draw, [
      this.p(u, v1, z0),
      this.p(u, v0, z0),
      this.p(u, v0, z0 + (height > 0 ? height : 999)),
      this.p(u, v1, z0 + (height > 0 ? height : 999)),
    ]);
  }

  private withTransform(
    a: number,
    b: number,
    ox: number,
    oy: number,
    height: number,
    width: number,
    draw: (width: number, height: number) => void,
    clip: Pt[],
  ): void {
    const ctx = this.ctx;
    ctx.save();
    poly(ctx, clip);
    ctx.clip();
    ctx.setTransform(a, b, 0, 1, ox, oy);
    draw(width, height);
    ctx.restore();
  }

  private wallDetail(wall: WallStyle, width: number, height: number, light: number): void {
    const ctx = this.ctx;
    const h = height || 400;
    const dark = css(shade(wall.color, light * 0.62), 0.55);
    const lite = css(shade(wall.color, light * 1.25), 0.35);
    switch (wall.detail) {
      case 'stone': {
        for (let row = 0, y = 0; y < h; row++, y += 9) {
          for (let x = (row % 2) * -9; x < width; x += 18 + this.rand() * 6) {
            ctx.fillStyle = css(shade(wall.color, light * (0.85 + this.rand() * 0.3)));
            ctx.fillRect(x + 1, -y - 8, 16, 7.5);
            ctx.fillStyle = lite;
            ctx.fillRect(x + 1, -y - 8, 16, 1.2);
          }
        }
        break;
      }
      case 'brick': {
        for (let row = 0, y = 0; y < h; row++, y += 5) {
          ctx.fillStyle = dark;
          ctx.fillRect(0, -y - 0.8, width, 0.8);
          for (let x = (row % 2) * 6; x < width; x += 12) ctx.fillRect(x, -y - 5, 0.8, 5);
        }
        break;
      }
      case 'planks': {
        for (let x = 0; x < width; x += 7) {
          ctx.fillStyle = this.rand() > 0.5 ? dark : lite;
          ctx.fillRect(x, -h, 1, h);
        }
        break;
      }
      case 'logs': {
        for (let y = 0; y < h; y += 8) {
          const g = ctx.createLinearGradient(0, -y - 8, 0, -y);
          g.addColorStop(0, css(shade(wall.color, light * 1.2)));
          g.addColorStop(1, css(shade(wall.color, light * 0.7)));
          ctx.fillStyle = g;
          ctx.fillRect(0, -y - 8, width, 7.5);
        }
        break;
      }
      case 'plaster': {
        for (let i = 0; i < (width * h) / 60; i++) {
          ctx.fillStyle = this.rand() > 0.5 ? dark : lite;
          ctx.globalAlpha = 0.25;
          ctx.fillRect(this.rand() * width, -this.rand() * h, 2 + this.rand() * 3, 1.5);
        }
        ctx.globalAlpha = 1;
        // Stone plinth.
        ctx.fillStyle = css(shade(0x8a8378, light));
        ctx.fillRect(0, -7, width, 7);
        break;
      }
      default:
        break;
    }
  }

  /** Window with frame and warm glow, in face-local coords. */
  window(x: number, y: number, w: number, h: number, arched = false): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#2b1d12';
    roundedOrArch(ctx, x - 1.5, y - 1.5, w + 3, h + 3, arched);
    ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ffd27a');
    g.addColorStop(1, '#c9762e');
    ctx.fillStyle = g;
    roundedOrArch(ctx, x, y, w, h, arched);
    ctx.fill();
    ctx.fillStyle = 'rgba(43,29,18,.9)';
    ctx.fillRect(x + w / 2 - 0.6, y, 1.2, h);
    ctx.fillRect(x, y + h * 0.55, w, 1.2);
  }

  door(x: number, w: number, h: number, color = 0x5a3518): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#24170d';
    roundedOrArch(ctx, x - 2, -h - 2, w + 4, h + 2, true);
    ctx.fill();
    ctx.fillStyle = css(color);
    roundedOrArch(ctx, x, -h, w, h, true);
    ctx.fill();
    ctx.fillStyle = css(shade(color, 0.6));
    for (let i = 1; i < 3; i++) ctx.fillRect(x + (w * i) / 3, -h + 3, 0.8, h - 3);
  }

  /** Gable roof with the ridge along u (axis='u') or along v. */
  gableRoof(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    eave: number,
    rise: number,
    color: number,
    wallColor: number,
    axis: 'u' | 'v',
    overhang = 0.12,
  ): void {
    const o = overhang;
    if (axis === 'u') {
      const vm = (v0 + v1) / 2;
      const top = eave + rise;
      const back = [this.p(u0 - o, v0 - o, eave), this.p(u1 + o, v0 - o, eave), this.p(u1 + o, vm, top), this.p(u0 - o, vm, top)];
      const gable = [this.p(u1, v0, eave), this.p(u1, v1, eave), this.p(u1, vm, top)];
      const front = [this.p(u0 - o, vm, top), this.p(u1 + o, vm, top), this.p(u1 + o, v1 + o, eave), this.p(u0 - o, v1 + o, eave)];
      this.fillPoly(back, css(shade(color, 0.8)));
      this.fillPoly(gable, css(shade(wallColor, 0.72)));
      this.strokePoly(gable, css(shade(wallColor, 0.4), 0.6), 1);
      this.roofSlope(front, color, 1.05, (t) => [this.p(u0 - o, vm + (v1 + o - vm) * t, top - rise * t), this.p(u1 + o, vm + (v1 + o - vm) * t, top - rise * t)]);
      this.ridge(this.p(u0 - o, vm, top), this.p(u1 + o, vm, top), color);
    } else {
      const um = (u0 + u1) / 2;
      const top = eave + rise;
      const back = [this.p(u0 - o, v0 - o, eave), this.p(um, v0 - o, top), this.p(um, v1 + o, top), this.p(u0 - o, v1 + o, eave)];
      const gable = [this.p(u0, v1, eave), this.p(u1, v1, eave), this.p(um, v1, top)];
      const front = [this.p(um, v0 - o, top), this.p(u1 + o, v0 - o, eave), this.p(u1 + o, v1 + o, eave), this.p(um, v1 + o, top)];
      this.fillPoly(back, css(shade(color, 0.85)));
      this.fillPoly(gable, css(shade(wallColor, 1.0)));
      this.strokePoly(gable, css(shade(wallColor, 0.4), 0.6), 1);
      this.roofSlope(front, color, 0.78, (t) => [this.p(um + (u1 + o - um) * t, v0 - o, top - rise * t), this.p(um + (u1 + o - um) * t, v1 + o, top - rise * t)]);
      this.ridge(this.p(um, v0 - o, top), this.p(um, v1 + o, top), color);
    }
  }

  /** Four-sided pyramid roof. */
  hipRoof(u0: number, v0: number, u1: number, v1: number, eave: number, rise: number, color: number, overhang = 0.12): Pt {
    const o = overhang;
    const apex = this.p((u0 + u1) / 2, (v0 + v1) / 2, eave + rise);
    const a = this.p(u0 - o, v0 - o, eave);
    const b = this.p(u1 + o, v0 - o, eave);
    const c = this.p(u1 + o, v1 + o, eave);
    const d = this.p(u0 - o, v1 + o, eave);
    this.fillPoly([a, b, apex], css(shade(color, 0.85)));
    this.fillPoly([d, a, apex], css(shade(color, 0.95)));
    this.roofSlope([d, c, apex], color, 1.05, (t) => [lerp(d, apex, t), lerp(c, apex, t)]);
    this.roofSlope([c, b, apex], color, 0.75, (t) => [lerp(c, apex, t), lerp(b, apex, t)]);
    this.ctx.strokeStyle = css(shade(color, 1.35), 0.8);
    this.ctx.lineWidth = 1.4;
    this.ctx.beginPath();
    this.ctx.moveTo(c[0], c[1]);
    this.ctx.lineTo(apex[0], apex[1]);
    this.ctx.stroke();
    return apex;
  }

  private roofSlope(pts: Pt[], color: number, light: number, rowAt: (t: number) => [Pt, Pt]): void {
    const ctx = this.ctx;
    const ys = pts.map((p) => p[1]);
    const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, css(shade(color, light * 1.12)));
    g.addColorStop(1, css(shade(color, light * 0.88)));
    this.fillPoly(pts, g);
    ctx.save();
    poly(ctx, pts);
    ctx.clip();
    const rows = 9;
    for (let i = 1; i < rows; i++) {
      const [s, e] = rowAt(i / rows);
      ctx.strokeStyle = css(shade(color, light * 0.55), 0.7);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(s[0], s[1]);
      ctx.lineTo(e[0], e[1]);
      ctx.stroke();
      // Tile seams: short ticks between this row and the previous one.
      const [ps, pe] = rowAt((i - 1) / rows);
      const n = 14;
      ctx.strokeStyle = css(shade(color, light * 0.7), 0.45);
      ctx.lineWidth = 0.8;
      for (let k = (i % 2) * 0.5; k < n; k++) {
        const t = k / n;
        const a = lerp(ps, pe, t);
        const b = lerp(s, e, t);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
    ctx.restore();
    this.strokePoly(pts, css(shade(color, 0.4), 0.6), 1.1);
  }

  private ridge(a: Pt, b: Pt, color: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = css(shade(color, 0.55));
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.strokeStyle = css(shade(color, 1.3), 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] - 1);
    ctx.lineTo(b[0], b[1] - 1);
    ctx.stroke();
  }

  /** Pennant on a pole, base at point (u,v,z). */
  flag(u: number, v: number, z: number, pole: number, team: number, big = false): void {
    const ctx = this.ctx;
    const [x, y] = this.p(u, v, z);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - pole);
    ctx.stroke();
    ctx.fillStyle = '#e8c35a';
    ctx.beginPath();
    ctx.arc(x, y - pole - 1.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    const fw = big ? 26 : 18;
    const fh = big ? 15 : 11;
    const g = ctx.createLinearGradient(x, 0, x + fw, 0);
    g.addColorStop(0, css(shade(team, 1.15)));
    g.addColorStop(1, css(shade(team, 0.75)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - pole + 1);
    ctx.quadraticCurveTo(x + fw * 0.5, y - pole - 3, x + fw, y - pole + fh * 0.35);
    ctx.lineTo(x + fw * 0.82, y - pole + fh * 0.6);
    ctx.quadraticCurveTo(x + fw * 0.5, y - pole + fh + 2, x + 1, y - pole + fh);
    ctx.closePath();
    ctx.fill();
  }

  /** Ground contact shadow + ambient occlusion under the footprint. */
  footShadow(): void {
    const ctx = this.ctx;
    const pts = [this.p(-0.15, -0.15, 0), this.p(this.w + 0.35, -0.15, 0), this.p(this.w + 0.35, this.h + 0.2, 0), this.p(-0.15, this.h + 0.2, 0)];
    ctx.save();
    ctx.filter = 'blur(4px)';
    this.fillPoly(pts, 'rgba(14,20,10,0.35)');
    ctx.restore();
  }

  /** Small crates / sacks prop at a ground point. */
  crate(u: number, v: number, size: number, color = 0x8a5a2e): void {
    const s = size / HW;
    this.box(u, v, u + s, v + s, 0, size * 0.75, { color, detail: 'planks' }, color);
  }
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function roundedOrArch(ctx: Ctx, x: number, y: number, w: number, h: number, arched: boolean): void {
  ctx.beginPath();
  if (arched) {
    const r = w / 2;
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
}
