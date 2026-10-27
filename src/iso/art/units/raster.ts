import { LIGHTING_ENABLED } from '../../../config/visual';
import { baked } from '../lighting/normalLayer';
import type { Charge, Material } from './materials';
import { newHit, type Prim } from './primitives';
import { intersectSolid, Solid } from './solid';

/** Supersampling per axis (4 samples per pixel). */
const SS = 2;
/** A neighbour this much farther away (art px) draws a contour line. */
const EDGE_DEPTH = 2.2;
const EDGE_DARKEN = 0.62;
const OUTLINE_RGB = [30, 20, 12] as const;
const OUTLINE_ALPHA = 0.9;
/** Grey under team parts in the albedo (the tinted mask covers it). */
const TEAM_UNDER = 0.62;

/** Outline dilation ring: offset and weight (diagonals and 2-px reach are softer). */
const RING: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 0.8], [-1, 1, 0.8], [1, -1, 0.8], [-1, -1, 0.8],
  [2, 0, 0.55], [-2, 0, 0.55], [0, 2, 0.55], [0, -2, 0.55],
];

/** Baked key light from the upper left front (view space). */
const KEY = norm3(-0.5, 0.72, 0.5);
const HALF = norm3(KEY[0], KEY[1], KEY[2] + 1);

function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** Material flattened to one object shape for the per-sample loop. */
class Surface {
  readonly color: number;
  readonly team: boolean;
  readonly metal: number;
  readonly bandCount: number;
  /** −1 = darken instead of recolour. */
  readonly bandColor: number;
  readonly bandWidth: number;
  readonly charge: Charge | null;

  constructor(m: Material) {
    this.color = m.color;
    this.team = m.team ?? false;
    this.metal = m.metal ?? 0;
    this.bandCount = m.bands?.count ?? 0;
    this.bandColor = m.bands?.color ?? -1;
    this.bandWidth = m.bands?.width ?? 0.12;
    this.charge = m.charge ?? null;
  }
}

/** Soft ground contact shadow under the figure (art px radii). */
export interface ContactShadow {
  readonly rx: number;
  readonly ry: number;
  readonly alpha: number;
}

/** One painted frame: RGBA blocks (w×h) plus solid coverage for the cast shadow. */
export interface FramePixels {
  readonly albedo: Uint8ClampedArray<ArrayBuffer>;
  readonly mask: Uint8ClampedArray<ArrayBuffer>;
  readonly normal: Uint8ClampedArray<ArrayBuffer>;
  /** 0..1 coverage of the solid figure (outline included, contact shadow excluded). */
  readonly coverage: Float32Array;
}

/**
 * Orthographic z-buffer rasterizer for rig primitives: shoots SS×SS
 * rays per pixel, keeps the nearest hit, then resolves albedo (baked
 * soft shading + metal glints + contour lines + dark outline), the
 * team mask, a view-space normal map and solid coverage.
 *
 * Frame pixel (px, py) ↔ view (px − originX, feetY − py).
 */
export class FrameRaster {
  private readonly sw: number;
  private readonly sh: number;
  private readonly depth: Float32Array;
  private readonly nx: Float32Array;
  private readonly ny: Float32Array;
  private readonly nz: Float32Array;
  private readonly band: Float32Array;
  /** Ellipsoid local across / front coordinates (heraldic charges). */
  private readonly across: Float32Array;
  private readonly front: Float32Array;
  /** 0 = empty, else material index + 1. */
  private readonly mat: Uint16Array;
  private readonly back: Uint8Array;
  private readonly out: FramePixels;
  /** Set by shade(): the sample fell on a coloured band (trim, not team colour). */
  private banded = false;

  constructor(
    readonly w: number,
    readonly h: number,
    private readonly originX: number,
    private readonly feetY: number,
  ) {
    this.sw = w * SS;
    this.sh = h * SS;
    const n = this.sw * this.sh;
    this.depth = new Float32Array(n);
    this.nx = new Float32Array(n);
    this.ny = new Float32Array(n);
    this.nz = new Float32Array(n);
    this.band = new Float32Array(n);
    this.across = new Float32Array(n);
    this.front = new Float32Array(n);
    this.mat = new Uint16Array(n);
    this.back = new Uint8Array(n);
    this.out = {
      albedo: new Uint8ClampedArray(w * h * 4),
      mask: new Uint8ClampedArray(w * h * 4),
      normal: new Uint8ClampedArray(w * h * 4),
      coverage: new Float32Array(w * h),
    };
  }

  /** Rasterizes the primitives and resolves the frame (buffers are reused). */
  paint(prims: readonly Prim[], materials: readonly Material[], shadow: ContactShadow): FramePixels {
    this.begin(prims, materials, shadow);
    while (!this.step(Infinity));
    return this.out;
  }

  private job: { solids: Solid[]; next: number; surfaces: Surface[]; shadow: ContactShadow } | null = null;

  /** Starts a resumable paint (see step()). */
  begin(prims: readonly Prim[], materials: readonly Material[], shadow: ContactShadow): void {
    this.mat.fill(0);
    this.depth.fill(-Infinity);
    this.job = { solids: prims.map((p) => new Solid(p)), next: 0, surfaces: materials.map((m) => new Surface(m)), shadow };
  }

  /**
   * Continues the paint until `deadline` (performance.now()); returns
   * true when the frame is resolved and `pixels` holds it. Lets a slow
   * frame spread over several game frames.
   */
  step(deadline: number): boolean {
    const job = this.job;
    if (!job) return true;
    while (job.next < job.solids.length) {
      const s = job.solids[job.next++];
      if (s) this.draw(s);
      if (job.next < job.solids.length && performance.now() >= deadline) return false;
    }
    this.resolve(job.surfaces, job.shadow);
    this.job = null;
    return true;
  }

  get pixels(): FramePixels {
    return this.out;
  }

  private draw(p: Solid): void {
    const sx0 = Math.max(0, Math.floor((p.x0 + this.originX) * SS - 0.5));
    const sx1 = Math.min(this.sw - 1, Math.ceil((p.x1 + this.originX) * SS - 0.5));
    const sy0 = Math.max(0, Math.floor((this.feetY - p.y1) * SS - 0.5));
    const sy1 = Math.min(this.sh - 1, Math.ceil((this.feetY - p.y0) * SS - 0.5));
    const hit = newHit();
    const id = p.mat + 1;
    for (let sy = sy0; sy <= sy1; sy++) {
      const Y = this.feetY - (sy + 0.5) / SS;
      let i = sy * this.sw + sx0;
      for (let sx = sx0; sx <= sx1; sx++, i++) {
        if (!intersectSolid(p, (sx + 0.5) / SS - this.originX, Y, hit)) continue;
        if (hit.z <= (this.depth[i] ?? 0)) continue;
        this.depth[i] = hit.z;
        this.nx[i] = hit.nx;
        this.ny[i] = hit.ny;
        this.nz[i] = hit.nz;
        this.band[i] = hit.u;
        this.across[i] = hit.v;
        this.front[i] = hit.f;
        this.back[i] = hit.back ? 1 : 0;
        this.mat[i] = id;
      }
    }
  }

  /** True when a nearby sample (±1, ±2 along x / y) is clearly farther away (contour). */
  private isEdge(i: number, sx: number, sy: number): boolean {
    const z = (this.depth[i] ?? 0) - EDGE_DEPTH;
    for (let k = 0; k < 8; k++) {
      const step = k < 4 ? 1 : 2;
      const dir = k & 3;
      const x = sx + (dir === 0 ? step : dir === 1 ? -step : 0);
      const y = sy + (dir === 2 ? step : dir === 3 ? -step : 0);
      if (x < 0 || y < 0 || x >= this.sw || y >= this.sh) continue;
      const j = y * this.sw + x;
      if (this.mat[j] !== 0 && (this.depth[j] ?? 0) < z) return true;
    }
    return false;
  }

  private resolve(materials: readonly Surface[], shadow: ContactShadow): void {
    const { w, h, sw } = this;
    const { albedo, mask, normal, coverage } = this.out;
    const inv = 1 / (SS * SS);
    const rgb: [number, number, number] = [0, 0, 0];
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let nX = 0;
        let nY = 0;
        let nZ = 0;
        let hits = 0;
        let teamHits = 0;
        let teamLum = 0;
        for (let oy = 0; oy < SS; oy++) {
          for (let ox = 0; ox < SS; ox++) {
            const sx = px * SS + ox;
            const sy = py * SS + oy;
            const i = sy * sw + sx;
            const m = this.mat[i] ?? 0;
            if (m === 0) continue;
            const mt = materials[m - 1];
            if (!mt) continue;
            hits++;
            const edge = this.isEdge(i, sx, sy) ? EDGE_DARKEN : 1;
            const lum = this.shade(i, mt, rgb) * edge;
            if (mt.team && !this.banded) {
              teamHits++;
              teamLum += lum;
              r += 255 * TEAM_UNDER * lum;
              g += 255 * TEAM_UNDER * lum;
              b += 255 * TEAM_UNDER * lum;
            } else {
              r += rgb[0] * edge;
              g += rgb[1] * edge;
              b += rgb[2] * edge;
            }
            const back = this.back[i] ? -1 : 1;
            nX += (this.nx[i] ?? 0) * back;
            nY += (this.ny[i] ?? 0) * back;
            nZ += Math.abs(this.nz[i] ?? 1);
          }
        }
        const o = py * w + px;
        const cov = hits * inv;
        coverage[o] = cov;
        const k = o * 4;
        // Premultiplied figure colour; outline and contact shadow are composited later.
        albedo[k] = hits ? r / hits : 0;
        albedo[k + 1] = hits ? g / hits : 0;
        albedo[k + 2] = hits ? b / hits : 0;
        albedo[k + 3] = cov * 255;
        const tl = teamHits ? Math.min(1, teamLum / teamHits) * 255 : 0;
        mask[k] = tl;
        mask[k + 1] = tl;
        mask[k + 2] = tl;
        mask[k + 3] = teamHits * inv * 255;
        const nl = Math.hypot(nX, nY, nZ);
        if (nl > 0) {
          normal[k] = (nX / nl) * 127.5 + 127.5;
          normal[k + 1] = (nY / nl) * 127.5 + 127.5;
          normal[k + 2] = (nZ / nl) * 127.5 + 127.5;
        } else {
          // Ground under the figure faces up (view space (0, cos30, sin30)).
          normal[k] = 127.5;
          normal[k + 1] = 0.866 * 127.5 + 127.5;
          normal[k + 2] = 0.5 * 127.5 + 127.5;
        }
        normal[k + 3] = 255;
      }
    }
    this.outlineAndShadow(shadow);
  }

  /** Lambert + rim + metal glint for one sample; writes RGB, returns luminance factor. */
  private shade(i: number, m: Surface, rgb: [number, number, number]): number {
    const nx = this.nx[i] ?? 0;
    const ny = this.ny[i] ?? 0;
    const nz = this.nz[i] ?? 1;
    let l: number;
    let spec = 0;
    if (this.back[i]) {
      l = 0.42;
    } else {
      const diff = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
      l = baked(0.6 + 0.62 * diff) * (0.8 + 0.2 * Math.max(0, nz));
      if (m.metal) {
        const hd = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
        spec = m.metal * Math.pow(hd, 22) * (LIGHTING_ENABLED ? 0.75 : 0.9);
      }
    }
    let c = m.color;
    this.banded = false;
    if (m.bandCount > 0) {
      const f = ((this.band[i] ?? 0) * m.bandCount) % 1;
      if (f < m.bandWidth) {
        if (m.bandColor >= 0) {
          c = m.bandColor;
          this.banded = true;
          spec = Math.max(spec, 0.35 * Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), 22));
        } else {
          l *= 0.62;
        }
      }
    }
    const ch = m.charge;
    if (ch && (this.front[i] ?? -1) > ch.front && Math.abs(this.across[i] ?? 0) < ch.panel && !this.back[i]) {
      const onCross = Math.abs(this.across[i] ?? 0) < ch.bar || Math.abs((this.band[i] ?? 0) - ch.armAt) < ch.arm;
      c = onCross ? ch.cross : ch.field;
      this.banded = true;
    }
    rgb[0] = Math.min(255, ((c >> 16) & 255) * l + spec * 255);
    rgb[1] = Math.min(255, ((c >> 8) & 255) * l + spec * 255);
    rgb[2] = Math.min(255, (c & 255) * l + spec * 255);
    return l + spec;
  }

  /** Dark 1-px (screen) outline around the figure, then the soft ground shadow beneath. */
  private outlineAndShadow(shadow: ContactShadow): void {
    const { w, h, originX, feetY } = this;
    const { albedo, coverage } = this.out;
    const grown = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let m = 0;
        for (let r = 0; r < RING.length; r++) {
          const [dx, dy, wgt] = RING[r]!;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const c = (coverage[yy * w + xx] ?? 0) * wgt;
          if (c > m) m = c;
        }
        grown[y * w + x] = m;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = y * w + x;
        const k = o * 4;
        const cov = coverage[o] ?? 0;
        const line = Math.max(0, (grown[o] ?? 0) - cov) * OUTLINE_ALPHA;
        // Figure over outline (premultiplied "over").
        let a = cov + line * (1 - cov);
        let r = (albedo[k] ?? 0) * cov + OUTLINE_RGB[0] * line * (1 - cov);
        let g = (albedo[k + 1] ?? 0) * cov + OUTLINE_RGB[1] * line * (1 - cov);
        let b = (albedo[k + 2] ?? 0) * cov + OUTLINE_RGB[2] * line * (1 - cov);
        coverage[o] = a;
        // Contact shadow under everything.
        const ex = (x + 0.5 - originX) / shadow.rx;
        const ey = (y + 0.5 - feetY) / shadow.ry;
        const d = ex * ex + ey * ey;
        if (d < 1) {
          const s = shadow.alpha * (1 - d) * (1 - d);
          r += 10 * s * (1 - a);
          g += 14 * s * (1 - a);
          b += 8 * s * (1 - a);
          a += s * (1 - a);
        }
        albedo[k] = a > 0 ? r / a : 0;
        albedo[k + 1] = a > 0 ? g / a : 0;
        albedo[k + 2] = a > 0 ? b / a : 0;
        albedo[k + 3] = a * 255;
      }
    }
  }
}
