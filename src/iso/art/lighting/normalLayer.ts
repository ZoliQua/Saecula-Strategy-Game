import { BAKED_SHADE_KEEP, LIGHTING_ENABLED } from '../../../config/visual';
import { poly } from '../canvas';
import { deriveNormals, type DeriveOptions, DEFAULT_DERIVE } from './deriveNormals';
import type { AnchoredLight } from './buildingLights';
import type { VolumePoint } from './shadowGeometry';
import { cylinderNormal, normalCss, type Vec3 } from './viewSpace';

type Pt = readonly [number, number];

/** A warm window that glows at dusk, in texture px. */
export interface GlowPoint {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * Painted world art plus everything the lighting needs about it.
 * Every painter of world art returns this (see lighting/README in
 * LightManager.ts for the contract).
 */
export interface LitArt {
  readonly canvas: HTMLCanvasElement;
  /** Same-size normal map, or null when lighting is disabled. */
  readonly normal: HTMLCanvasElement | null;
  /** Building volume points for the projected cast shadow (empty = none). */
  readonly volume: readonly VolumePoint[];
  /** Window glow spots (empty = none). */
  readonly glows: readonly GlowPoint[];
  /** Torches / forges / lanterns recorded by the painter (front-corner relative, world px). */
  readonly lights: readonly AnchoredLight[];
  /** Chimney tops emitting smoke (front-corner relative, world px). */
  readonly smoke: ReadonlyArray<readonly [number, number]>;
}

/** Scales a baked light factor towards 1 when dynamic lighting does the shading. */
export function baked(light: number): number {
  return LIGHTING_ENABLED ? 1 + (light - 1) * BAKED_SHADE_KEEP : light;
}

/**
 * Parallel "face normal" canvas for IsoPainter: every face it fills
 * with albedo is also filled here with its encoded normal, in the same
 * painter's order, so occlusion matches. Pixels never covered by a
 * face fall back to derived (pillow + bump) normals in finish().
 */
export class NormalLayer {
  readonly canvas: HTMLCanvasElement | null;
  private readonly ctx: CanvasRenderingContext2D | null;

  constructor(width: number, height: number) {
    if (!LIGHTING_ENABLED) {
      this.canvas = null;
      this.ctx = null;
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /** Fills a polygon (texture px) with a constant normal. */
  fill(pts: readonly Pt[], n: Vec3): void {
    const ctx = this.ctx;
    if (!ctx) return;
    poly(ctx, pts);
    ctx.fillStyle = normalCss(n);
    ctx.fill();
  }

  /** Upright cylinder (column, trunk, tower) covering a screen rect. */
  cylinder(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      g.addColorStop(t, normalCss(cylinderNormal((t - 0.5) * Math.PI * 0.9)));
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  /** Cylinder normals clipped to a polygon (domes, helms, round props). */
  cylinderPoly(pts: readonly Pt[], x: number, w: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.save();
    poly(ctx, pts);
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      g.addColorStop(t, normalCss(cylinderNormal((t - 0.5) * Math.PI * 0.9)));
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  /**
   * Cylinder normals along stroked polylines (legs, spokes, rims, poles):
   * only the stroke is covered, never the rectangle around it. The
   * cylinder gradient runs across x..x+w.
   */
  cylinderStroke(lines: ReadonlyArray<readonly Pt[]>, width: number, x: number, w: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      g.addColorStop(t, normalCss(cylinderNormal((t - 0.5) * Math.PI * 0.9)));
    }
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const line of lines) {
      line.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }

  /** Combines faces with the albedo into the final normal map. */
  finish(albedo: HTMLCanvasElement, opts: DeriveOptions = BUILDING_DERIVE): HTMLCanvasElement | null {
    if (!this.canvas || !this.ctx) return null;
    return normalMapFor(albedo, this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data, opts);
  }
}

/** Buildings: faces carry the shape, so only a little pillow on loose props. */
export const BUILDING_DERIVE: DeriveOptions = { bulge: 3, bulgeStrength: 3, upBias: 0.6, detail: 1.6 };
/** Trees, bushes: soft round volume. */
export const FOLIAGE_DERIVE: DeriveOptions = { bulge: 9, bulgeStrength: 7, upBias: 0.45, detail: 1.2 };
/** Rocks, stumps: tighter volume, crisper detail. */
export const ROCK_DERIVE: DeriveOptions = { bulge: 6, bulgeStrength: 6, upBias: 0.5, detail: 2 };
/** Units: cylinder-ish bodies, per-frame strips (small blur keeps frames apart). */
export const UNIT_DERIVE: DeriveOptions = { bulge: 4, bulgeStrength: 5, upBias: 0.3, detail: 1 };

/**
 * Derives a normal map canvas from painted albedo (and optional face
 * normals). Returns null when lighting is disabled.
 */
export function normalMapFor(
  albedo: HTMLCanvasElement,
  faces: Uint8ClampedArray | null = null,
  opts: DeriveOptions = DEFAULT_DERIVE,
): HTMLCanvasElement | null {
  if (!LIGHTING_ENABLED) return null;
  const w = albedo.width;
  const h = albedo.height;
  const src = albedo.getContext('2d');
  if (!src || w === 0 || h === 0) return null;
  const data = deriveNormals(src.getImageData(0, 0, w, h).data, w, h, faces, opts);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  img.data.set(data);
  ctx.putImageData(img, 0, 0);
  return out;
}
