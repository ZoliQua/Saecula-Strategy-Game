import { TILE_HEIGHT, TILE_WIDTH } from '../../config/constants';
import { ART_SCALE, BUILDING_BOTTOM_PAD, makeCanvas, poly, type Ctx } from './canvas';
import type { AnchoredLight } from './lighting/buildingLights';
import { baked, NormalLayer, type GlowPoint, type LitArt } from './lighting/normalLayer';
import type { VolumePoint } from './lighting/shadowGeometry';
import { N_LEFT, N_RIGHT, N_UP, slopeNormal, SCREEN_PER_WORLD_HEIGHT, type Vec3 } from './lighting/viewSpace';
import { css, rng, shade } from './palette';
import { lerp, paintDoor, paintFlag, paintRidge, paintWindow, WARM_WINDOW, type WindowLook } from './isoProps';
import { paintRoofCover, type RoofMaterial } from './roofCover';
import { paintWallDetail } from './wallDetail';

/** Half tile extents at art resolution. */
export const HW = (TILE_WIDTH / 2) * ART_SCALE;
export const HH = (TILE_HEIGHT / 2) * ART_SCALE;

type Pt = readonly [number, number];

export interface WallStyle {
  readonly color: number;
  /** Optional decoration painted in face-local coordinates. */
  readonly detail?: 'stone' | 'fieldstone' | 'plaster' | 'planks' | 'logs' | 'brick';
}

/**
 * Paints isometric volumes onto a canvas. World axes:
 *   u — along tile x (screen down-right), v — along tile y (screen
 *   down-left), z — up, in art pixels. The footprint's front corner
 *   (u=w, v=h, z=0) sits at the bottom centre of the canvas.
 * Light comes from the upper left, so faces looking towards +v are
 * lit and faces looking towards +u are in shade.
 *
 * Lighting contract: every face primitive (box, ground, roofs, foot
 * shadow, normalCylinder) also paints its normal into `normals`, and
 * boxes/roofs record volume points for the cast shadow; windows record
 * glow spots. Paint direct-ctx details freely — they inherit the normal
 * of the face beneath, or a derived one. Call result() at the end.
 */
export class IsoPainter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: Ctx;
  readonly cx: number;
  readonly by: number;
  readonly normals: NormalLayer;
  private readonly rand: () => number;
  private readonly volume: VolumePoint[] = [];
  private readonly glows: GlowPoint[] = [];
  private readonly lights: AnchoredLight[] = [];
  private readonly smoke: Array<readonly [number, number]> = [];
  /** Cover painted on the following roof slopes (tiles, shingles, thatch, slate, copper). */
  material: RoofMaterial = 'tile';
  /** Frame and glazing of the following windows. */
  windowLook: WindowLook = WARM_WINDOW;

  constructor(
    readonly w: number,
    readonly h: number,
    readonly maxHeight: number,
    seed: number,
  ) {
    // Side margin keeps the blurred foot shadow (which reaches ~0.5 tile past the footprint) unclipped.
    const width = (w + h) * HW + 72;
    const height = (w + h) * HH + maxHeight + BUILDING_BOTTOM_PAD + 8;
    const { canvas, ctx } = makeCanvas(width, height);
    this.canvas = canvas;
    this.ctx = ctx;
    this.cx = canvas.width / 2;
    this.by = canvas.height - BUILDING_BOTTOM_PAD;
    this.rand = rng(seed);
    this.normals = new NormalLayer(canvas.width, canvas.height);
  }

  /** Albedo + normal map (skipped when `withNormals` is false) + shadow volume + window glows. */
  result(withNormals = true): LitArt {
    return {
      canvas: this.canvas,
      normal: withNormals ? this.normals.finish(this.canvas) : null,
      volume: this.volume,
      glows: this.glows,
      lights: this.lights,
      smoke: this.smoke,
    };
  }

  /** Canvas point → world px offset from the sprite anchor (front corner). */
  private anchorOffset(x: number, y: number): readonly [number, number] {
    return [(x - this.cx) / ART_SCALE, (y - this.by) / ART_SCALE];
  }

  /** Records a building-anchored point light whose ground point is (u, v). */
  addLight(u: number, v: number, light: Omit<AnchoredLight, 'dx' | 'dy'>): void {
    const [dx, dy] = this.anchorOffset(...this.p(u, v, 0));
    this.lights.push({ ...light, dx, dy });
  }

  /** Records a chimney top (smoke source) at (u, v, z). */
  addSmoke(u: number, v: number, z: number): void {
    this.smoke.push(this.anchorOffset(...this.p(u, v, z)));
  }

  /** Records an emissive spot (flame, lit lantern) that glows at dusk, canvas px. */
  addGlow(x: number, y: number, r: number): void {
    this.glows.push({ x, y, r });
  }

  /** Records a point of a solid (u, v at height z art px) for the cast shadow. */
  addVolumePoint(u: number, v: number, z: number): void {
    const [gx, gy] = this.p(u, v, 0);
    this.volume.push({ gx, gy, z });
  }

  /** Cylinder normals for a directly painted upright (column, pole). */
  normalCylinder(x: number, y: number, w: number, h: number): void {
    this.normals.cylinder(x, y, w, h);
  }

  /** Roof slope normal: descends along (du, dv) by `rise` art px over `runTiles`. */
  slope(du: number, dv: number, runTiles: number, rise: number) {
    return slopeNormal(du, dv, runTiles * HW * Math.SQRT2, rise / SCREEN_PER_WORLD_HEIGHT);
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
    this.normals.fill(pts, N_UP);
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
    this.fillPoly(right, this.faceGradient(right, wall.color, baked(0.72)));
    this.normals.fill(left, N_LEFT);
    this.normals.fill(right, N_RIGHT);
    if (top !== undefined) this.normals.fill(topPts, N_UP);
    for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as const) this.addVolumePoint(u, v, z1);
    if (wall.detail) {
      this.leftFace(u0, u1, v1, z0, (w, hgt) => paintWallDetail(this.ctx, this.rand, wall, w, hgt, 1.0), z1 - z0);
      this.rightFace(v0, v1, u1, z0, (w, hgt) => paintWallDetail(this.ctx, this.rand, wall, w, hgt, baked(0.72)), z1 - z0);
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
    g.addColorStop(1, css(shade(color, light * baked(0.7))));
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

  /** Window with frame and warm glow, in face-local coords; glows at dusk. */
  window(x: number, y: number, w: number, h: number, arched = false): void {
    const c = this.ctx.getTransform().transformPoint(new DOMPoint(x + w / 2, y + h / 2));
    this.glows.push({ x: c.x, y: c.y, r: Math.max(w, h) });
    paintWindow(this.ctx, x, y, w, h, arched, this.windowLook);
  }

  door(x: number, w: number, h: number, color = 0x5a3518): void {
    paintDoor(this.ctx, x, w, h, color);
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
    gableDetail?: (width: number, rise: number) => void,
  ): void {
    const o = overhang;
    if (axis === 'u') {
      const vm = (v0 + v1) / 2;
      const top = eave + rise;
      const back = [this.p(u0 - o, v0 - o, eave), this.p(u1 + o, v0 - o, eave), this.p(u1 + o, vm, top), this.p(u0 - o, vm, top)];
      const gable = [this.p(u1, v0, eave), this.p(u1, v1, eave), this.p(u1, vm, top)];
      const front = [this.p(u0 - o, vm, top), this.p(u1 + o, vm, top), this.p(u1 + o, v1 + o, eave), this.p(u0 - o, v1 + o, eave)];
      const run = vm - (v0 - o);
      this.fillPoly(back, css(shade(color, baked(0.8))));
      this.normals.fill(back, this.slope(0, -1, run, rise));
      this.fillPoly(gable, css(shade(wallColor, baked(0.72))));
      this.normals.fill(gable, N_RIGHT);
      if (gableDetail) this.rightFace(v0, v1, u1, eave, (w) => gableDetail(w, rise));
      this.strokePoly(gable, css(shade(wallColor, 0.4), 0.6), 1);
      this.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, [this.p(u0 - o, vm, 0), this.p(u1 + o, vm, 0)], top);
      this.roofSlope(front, color, baked(1.05), this.slope(0, 1, run, rise), (t) => [this.p(u0 - o, vm + (v1 + o - vm) * t, top - rise * t), this.p(u1 + o, vm + (v1 + o - vm) * t, top - rise * t)]);
      paintRidge(this.ctx, this.p(u0 - o, vm, top), this.p(u1 + o, vm, top), color);
    } else {
      const um = (u0 + u1) / 2;
      const top = eave + rise;
      const back = [this.p(u0 - o, v0 - o, eave), this.p(um, v0 - o, top), this.p(um, v1 + o, top), this.p(u0 - o, v1 + o, eave)];
      const gable = [this.p(u0, v1, eave), this.p(u1, v1, eave), this.p(um, v1, top)];
      const front = [this.p(um, v0 - o, top), this.p(u1 + o, v0 - o, eave), this.p(u1 + o, v1 + o, eave), this.p(um, v1 + o, top)];
      const run = um - (u0 - o);
      this.fillPoly(back, css(shade(color, baked(0.85))));
      this.normals.fill(back, this.slope(-1, 0, run, rise));
      this.fillPoly(gable, css(shade(wallColor, 1.0)));
      this.normals.fill(gable, N_LEFT);
      if (gableDetail) this.leftFace(u0, u1, v1, eave, (w) => gableDetail(w, rise));
      this.strokePoly(gable, css(shade(wallColor, 0.4), 0.6), 1);
      this.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, [this.p(um, v0 - o, 0), this.p(um, v1 + o, 0)], top);
      this.roofSlope(front, color, baked(0.78), this.slope(1, 0, run, rise), (t) => [this.p(um + (u1 + o - um) * t, v0 - o, top - rise * t), this.p(um + (u1 + o - um) * t, v1 + o, top - rise * t)]);
      paintRidge(this.ctx, this.p(um, v0 - o, top), this.p(um, v1 + o, top), color);
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
    const runU = (u1 - u0) / 2 + o;
    const runV = (v1 - v0) / 2 + o;
    this.fillPoly([a, b, apex], css(shade(color, baked(0.85))));
    this.normals.fill([a, b, apex], this.slope(0, -1, runV, rise));
    this.fillPoly([d, a, apex], css(shade(color, baked(0.95))));
    this.normals.fill([d, a, apex], this.slope(-1, 0, runU, rise));
    this.roofSlope([d, c, apex], color, baked(1.05), this.slope(0, 1, runV, rise), (t) => [lerp(d, apex, t), lerp(c, apex, t)]);
    this.roofSlope([c, b, apex], color, baked(0.75), this.slope(1, 0, runU, rise), (t) => [lerp(c, apex, t), lerp(b, apex, t)]);
    this.recordRoof(u0 - o, v0 - o, u1 + o, v1 + o, eave, [this.p((u0 + u1) / 2, (v0 + v1) / 2, 0)], eave + rise);
    this.ctx.strokeStyle = css(shade(color, 1.35), 0.8);
    this.ctx.lineWidth = 1.4;
    this.ctx.beginPath();
    this.ctx.moveTo(c[0], c[1]);
    this.ctx.lineTo(apex[0], apex[1]);
    this.ctx.stroke();
    return apex;
  }

  /** Eave corners at `eave` plus ridge/apex ground points at `top`. */
  recordRoof(u0: number, v0: number, u1: number, v1: number, eave: number, peaks: Pt[], top: number): void {
    for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] as const) this.addVolumePoint(u, v, eave);
    for (const [gx, gy] of peaks) this.volume.push({ gx, gy, z: top });
  }

  roofSlope(pts: Pt[], color: number, light: number, normal: Vec3, rowAt: (t: number) => [Pt, Pt]): void {
    const ctx = this.ctx;
    this.normals.fill(pts, normal);
    const ys = pts.map((p) => p[1]);
    const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, css(shade(color, light * 1.12)));
    g.addColorStop(1, css(shade(color, light * 0.88)));
    this.fillPoly(pts, g);
    paintRoofCover(ctx, this.material, pts, color, light, rowAt, this.rand);
    this.strokePoly(pts, css(shade(color, 0.4), 0.6), 1.1);
  }

  /** Pennant on a pole, base at point (u,v,z). */
  flag(u: number, v: number, z: number, pole: number, team: number, big = false): void {
    const [x, y] = this.p(u, v, z);
    paintFlag(this.ctx, x, y, pole, team, big);
  }

  /** Ground contact shadow + ambient occlusion under the footprint. */
  footShadow(): void {
    const ctx = this.ctx;
    const pts = [this.p(-0.15, -0.15, 0), this.p(this.w + 0.35, -0.15, 0), this.p(this.w + 0.35, this.h + 0.2, 0), this.p(-0.15, this.h + 0.2, 0)];
    ctx.save();
    ctx.filter = 'blur(4px)';
    this.fillPoly(pts, 'rgba(14,20,10,0.35)');
    ctx.restore();
    this.normals.fill(pts, N_UP);
  }

  /** Small crates / sacks prop at a ground point. */
  crate(u: number, v: number, size: number, color = 0x8a5a2e): void {
    const s = size / HW;
    this.box(u, v, u + s, v + s, 0, size * 0.75, { color, detail: 'planks' }, color);
  }
}

