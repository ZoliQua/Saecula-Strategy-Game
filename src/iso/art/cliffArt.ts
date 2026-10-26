import { TILE_HEIGHT, TILE_WIDTH } from '../../config/constants';
import { cliffFootDistance, type CliffTest } from '../../map/cliffGeometry';
import {
  buildRelief,
  footDistance,
  marchRelief,
  nearCliff,
  reliefGradient,
  sampleRelief,
  type Relief,
  type ReliefHit,
} from '../../map/cliffRelief';
import { baked } from './lighting/normalLayer';
import { dot, normalize, tileToView, type Vec3 } from './lighting/viewSpace';
import { fbm, hash2, mix, shade, valueNoise } from './palette';

const ROCK_TOP = 0x7d766a;
const ROCK_TOP_LIGHT = 0xa49a87;
const HIGHLAND_GRASS = 0x5f7535;
const HIGHLAND_GRASS_DRY = 0x87884a;
const FACE_WARM = 0xa38a68;
const FACE_GREY = 0x7f786e;
const FACE_DARK = 0x5e554a;
const SCREE = 0x6f6656;
const PASS_DIRT = 0x8a7352;
/** Mean strata band thickness on a face, screen px. */
const STRATA = 6.5;
/** Fixed light the baked face shading assumes (upper left, towards the viewer). */
const BAKED_LIGHT: Vec3 = normalize(tileToView(0.2, 1, 0.9));

/** Static description of the map's cliffs for painting. */
export interface CliffField {
  readonly width: number;
  readonly height: number;
  readonly isCliff: CliffTest;
  /** Walkable tiles squeezed between cliffs on opposite sides (mountain passes). */
  readonly isPass: CliffTest;
  readonly relief: Relief;
  /** Highland grass patch noise on the relief grid. */
  readonly grass: Float32Array;
  /** Lazily filled per-world-column noise for the faces (index = round(wx) − offset). */
  readonly columns: { readonly offset: number; readonly wobble: Float32Array; readonly moss: Float32Array };
}

/** Builds a CliffField from a terrain grid (1 = cliff). */
export function cliffField(width: number, height: number, cliff: Uint8Array, cliffHeight: number, seed = 0, res = 8): CliffField {
  const isCliff: CliffTest = (x, y) => x >= 0 && y >= 0 && x < width && y < height && cliff[y * width + x] === 1;
  const pass = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isCliff(x, y)) continue;
      if ((isCliff(x - 1, y) && isCliff(x + 1, y)) || (isCliff(x, y - 1) && isCliff(x, y + 1))) pass[y * width + x] = 1;
    }
  }
  const isPass: CliffTest = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pass[y * width + x] === 1;
  const relief = buildRelief(isCliff, width, height, cliffHeight, seed, res);
  const grass = new Float32Array(relief.top.length);
  const cols = width * relief.res + 1;
  for (let i = 0; i < grass.length; i++) {
    grass[i] = fbm(((i % cols) / relief.res - 0.5) * 0.75, (Math.floor(i / cols) / relief.res - 0.5) * 0.75, 51);
  }
  const offset = -(height * TILE_WIDTH) / 2 - TILE_WIDTH;
  const span = ((width + height) * TILE_WIDTH) / 2 + TILE_WIDTH * 2;
  const columns = { offset, wobble: new Float32Array(span).fill(NaN), moss: new Float32Array(span).fill(NaN) };
  return { width, height, isCliff, isPass, relief, grass, columns };
}

/** Tile-space coordinates of a world pixel's ground point. */
export function groundPoint(wx: number, wy: number): [number, number] {
  const a = wx / (TILE_WIDTH / 2);
  const b = wy / (TILE_HEIGHT / 2);
  return [(a + b) / 2, (b - a) / 2];
}

export function hitAt(field: CliffField, wx: number, wy: number): ReliefHit | null {
  const [u, v] = groundPoint(wx, wy);
  return marchRelief(field.relief, u, v);
}

function rimShade(field: CliffField, u: number, v: number): number {
  const edge = Math.min(u + 0.5, v + 0.5, field.width - 0.5 - u, field.height - 0.5 - v);
  return edge < 1.5 ? 0.55 + 0.45 * Math.max(0, edge / 1.5) : 1;
}

/** Outward horizontal normal of a face at the hit (view space). */
function faceNormal(field: CliffField, hit: ReliefHit): Vec3 {
  const [gu, gv] = reliefGradient(field.relief, field.relief.edge, hit.u, hit.v);
  const len = Math.hypot(gu, gv);
  // Flat spots of the edge field: assume the face looks at the camera.
  return len < 1e-4 ? normalize(tileToView(1, 1, 0)) : normalize(tileToView(-gu / len, -gv / len, 0));
}

/** Per-world-column noise, cached (faces read it for every pixel of a column). */
function columnNoise(field: CliffField, wx: number, which: 0 | 1): number {
  const c = field.columns;
  const i = Math.round(wx) - c.offset;
  const arr = which === 0 ? c.wobble : c.moss;
  if (i < 0 || i >= arr.length) return which === 0 ? fbm(wx * 0.045, 3.3, 61) : fbm(wx * 0.07, 7, 71);
  let val = arr[i] ?? NaN;
  if (Number.isNaN(val)) {
    val = which === 0 ? fbm((i + c.offset) * 0.045, 3.3, 61) : fbm((i + c.offset) * 0.07, 7, 71);
    arr[i] = val;
  }
  return val;
}

function strataAt(field: CliffField, hit: ReliefHit, wx: number): { band: number; frac: number } {
  const y = hit.h + (columnNoise(field, wx, 0) - 0.5) * 8;
  const band = Math.floor(y / STRATA);
  return { band, frac: y / STRATA - band };
}

/** Packs float channels into 0xRRGGBB. */
function pack(r: number, g: number, b: number): number {
  const c = (x: number) => (x < 0 ? 0 : x > 255 ? 255 : Math.round(x));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}

const rgb = (hex: number): [number, number, number] => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
const TOP_A = rgb(ROCK_TOP);
const TOP_B = rgb(ROCK_TOP_LIGHT);
const GRASS_A = rgb(HIGHLAND_GRASS);
const GRASS_B = rgb(HIGHLAND_GRASS_DRY);
const FACE_A = rgb(FACE_WARM);
const FACE_B = rgb(FACE_GREY);
const FACE_D = rgb(FACE_DARK);

/** Albedo of a rock surface point (baked light kept per the lighting contract). */
export function cliffColour(field: CliffField, hit: ReliefHit, wx: number, wy: number): number {
  const { u, v } = hit;
  const r = field.relief;
  let R: number;
  let G: number;
  let B: number;
  let k: number;
  if (hit.surface === 'top') {
    const fine = valueNoise(wx * 0.15, wy * 0.3, 53);
    R = TOP_A[0] + (TOP_B[0] - TOP_A[0]) * fine;
    G = TOP_A[1] + (TOP_B[1] - TOP_A[1]) * fine;
    B = TOP_A[2] + (TOP_B[2] - TOP_A[2]) * fine;
    if (valueNoise(u * 3.1, v * 3.1, 57) < 0.13) k = 0.76;
    else k = 1;
    // Grass keeps back from the rim; the rim itself is a bright worn lip.
    const rim = Math.max(0, Math.min(1, (sampleRelief(r, r.edge, u, v) - 0.5) / 0.35));
    const grass = Math.max(0, Math.min(1, (sampleRelief(r, field.grass, u, v) - 0.42) / 0.16)) * rim;
    R *= k;
    G *= k;
    B *= k;
    if (grass > 0) {
      const t = 0.88 + fine * 0.22;
      R += ((GRASS_A[0] + (GRASS_B[0] - GRASS_A[0]) * fine) * t - R) * grass;
      G += ((GRASS_A[1] + (GRASS_B[1] - GRASS_A[1]) * fine) * t - G) * grass;
      B += ((GRASS_A[2] + (GRASS_B[2] - GRASS_A[2]) * fine) * t - B) * grass;
    }
    k = hash2(Math.floor(wx), Math.floor(wy), 59) < 0.05 ? 1.15 : 1;
    if (rim < 0.12) k *= baked(1.28);
    const [gu, gv] = reliefGradient(r, r.top, u, v);
    k *= baked(1 - (gu + gv) * 0.01) * rimShade(field, u, v);
    return pack(R * k, G * k, B * k);
  }
  const { band, frac } = strataAt(field, hit, wx);
  const tone = valueNoise(wx * 0.02, band * 0.6, 63);
  R = FACE_A[0] + (FACE_B[0] - FACE_A[0]) * tone;
  G = FACE_A[1] + (FACE_B[1] - FACE_A[1]) * tone;
  B = FACE_A[2] + (FACE_B[2] - FACE_A[2]) * tone;
  k = 0.84 + hash2(band, Math.floor(wx / 23), 65) * 0.26;
  R *= k;
  G *= k;
  B *= k;
  let dark = 0;
  if (frac < 0.16) dark = 0.55;
  else if (frac > 0.84) {
    R *= 1.14;
    G *= 1.14;
    B *= 1.14;
  }
  // Vertical fractures between blocks.
  if (valueNoise(wx * 0.17, hit.h * 0.08 + band * 0.4, 67) < 0.1) dark = 0.75;
  if (dark > 0) {
    R += (FACE_D[0] - R) * dark;
    G += (FACE_D[1] - G) * dark;
    B += (FACE_D[2] - B) * dark;
  }
  const top = hit.h / r.maxHeight;
  // Moss and grass hanging over the lip; a damp dark foot.
  if (top > 0.78 && columnNoise(field, wx, 1) > 0.52) {
    const m = Math.min(1, (top - 0.78) * 4);
    R += (GRASS_A[0] - R) * m;
    G += (GRASS_A[1] - G) * m;
    B += (GRASS_A[2] - B) * m;
  }
  k = (hash2(Math.floor(wx), Math.floor(wy), 69) < 0.07 ? 0.86 : 1) * (0.58 + 0.42 * Math.min(1, hit.h / 11));
  const lambert = Math.max(0, dot(faceNormal(field, hit), BAKED_LIGHT));
  k *= baked(0.7 + 0.42 * lambert) * rimShade(field, u, v);
  return pack(R * k, G * k, B * k);
}

/** View-space normal of a rock surface point (strata ledges tilt the faces). */
export function cliffNormal(field: CliffField, hit: ReliefHit, wx: number): Vec3 {
  if (hit.surface === 'top') {
    const [gu, gv] = reliefGradient(field.relief, field.relief.top, hit.u, hit.v);
    const n = (valueNoise(hit.u * 3, hit.v * 3, 73) - 0.5) * 0.25;
    return normalize(tileToView(-gu / 32 + n, -gv / 32 - n, 1));
  }
  const f = faceNormal(field, hit);
  const { frac } = strataAt(field, hit, wx);
  // Ledge tops lean up, undercuts lean down.
  const tilt = frac > 0.8 ? 0.5 : frac < 0.16 ? -0.35 : 0;
  return normalize([f[0], f[1] + tilt, f[2]]);
}

/**
 * Ground colour change at the foot of the cliffs and on mountain passes:
 * scree tint, contact shadow, gravel speckle. Returns the new colour, or
 * -1 when the ground is untouched.
 */
export function groundTouch(field: CliffField, wx: number, wy: number, ground: number): number {
  const [u, v] = groundPoint(wx, wy);
  if (!nearCliff(field.relief, u, v)) return -1;
  const onCliff = field.isCliff(Math.floor(u + 0.5), Math.floor(v + 0.5));
  const near = onCliff || cliffFootDistance(field.isCliff, u, v) < 1.2;
  const pass = passWeight(field, u, v);
  if (!near && pass === 0) return -1;
  let c = ground;
  if (pass > 0) c = mix(c, shade(PASS_DIRT, 0.9 + fbm(wx * 0.08, wy * 0.16, 75) * 0.2), pass * 0.75);
  if (near) {
    const d = footDistance(field.relief, u, v);
    c = mix(c, SCREE, Math.exp(-d / 0.28) * (onCliff ? 0.85 : 0.55));
    if (hash2(Math.floor(wx), Math.floor(wy), 77) < 0.28 * Math.exp(-d / 0.2)) {
      c = shade(c, hash2(Math.floor(wx), Math.floor(wy), 78) > 0.5 ? 1.35 : 0.68);
    }
    c = shade(c, 1 - 0.55 * Math.exp(-d / 0.13));
  }
  return c;
}

function passWeight(field: CliffField, u: number, v: number): number {
  const fx = Math.floor(u);
  const fy = Math.floor(v);
  const ax = u - fx;
  const ay = v - fy;
  const p = (x: number, y: number) => (field.isPass(x, y) ? 1 : 0);
  const top = p(fx, fy) * (1 - ax) + p(fx + 1, fy) * ax;
  const bot = p(fx, fy + 1) * (1 - ax) + p(fx + 1, fy + 1) * ax;
  return top * (1 - ay) + bot * ay;
}

/** Screen-space bounding box (world px) of everything cliff tile (tx, ty) can show. */
export function blockBounds(tx: number, ty: number, maxHeight: number): { x: number; y: number; w: number; h: number } {
  const cx = (tx - ty) * (TILE_WIDTH / 2);
  const cy = (tx + ty) * (TILE_HEIGHT / 2);
  const h = Math.ceil(maxHeight);
  return { x: cx - TILE_WIDTH / 2, y: cy - TILE_HEIGHT / 2 - h, w: TILE_WIDTH, h: TILE_HEIGHT + h };
}
