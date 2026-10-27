import { TILE_HEIGHT, TILE_WIDTH } from '../../config/constants';
import { TERRAIN, type TerrainId } from '../../map/TerrainTypes';
import { screenToTile } from '../coordinates';
import { makeCanvas } from './canvas';
import type { CliffField } from './cliffArt';
import { waterCoverage } from '../../map/waterMask';
import { CliffChunkBake, rectTouchesCliffs, type OccluderSink } from './cliffPainter';
import { css, fbm, hash2, hexToRgb, mix, shade } from './palette';

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;
/** Terrain is sampled every SAMPLE_STEP px, then upscaled smoothly. */
const SAMPLE_STEP = 2;

const GRASS_LUSH = 0x5f9139;
const GRASS_DRY = 0x93a849;
const GRASS_DEEP = 0x467532;
const FOREST_FLOOR = 0x3c5528;
const FOREST_SOIL = 0x5b4a2c;
const ROCKY = 0x8b8169;
const WATER = 0x2f6f9a;
const WET_SAND = 0x7d7253;

export interface TerrainSource {
  readonly width: number;
  readonly height: number;
  getTile(tx: number, ty: number): TerrainId;
}

export interface TerrainChunk {
  readonly canvas: HTMLCanvasElement;
  /** Downscaled normal map when cliffs show in the chunk; null = flat ground. */
  readonly normal: HTMLCanvasElement | null;
}

/**
 * Paints one terrain chunk covering world rect (x0, y0, w, h). Colours
 * come from world-space noise, so neighbouring chunks join seamlessly
 * and there is no visible tile grid. Cliff plateaus (when `cliffs` is
 * given) are painted with their faces, tops and scree in place.
 */
export function paintTerrainChunk(
  map: TerrainSource,
  x0: number,
  y0: number,
  w: number,
  h: number,
  cliffs: CliffField | null = null,
  withNormals = true,
  occluders: OccluderSink | null = null,
): TerrainChunk {
  const sw = Math.ceil(w / SAMPLE_STEP) + 1;
  const sh = Math.ceil(h / SAMPLE_STEP) + 1;
  const low = makeCanvas(sw, sh);
  const img = low.ctx.createImageData(sw, sh);
  const data = img.data;
  const bake =
    cliffs && rectTouchesCliffs(cliffs, x0, y0, w, h)
      ? new CliffChunkBake(cliffs, x0, y0, sw, sh, SAMPLE_STEP, occluders, withNormals)
      : null;
  const weight = (tx: number, ty: number, id: TerrainId): number => {
    const fx = Math.floor(tx);
    const fy = Math.floor(ty);
    const ax = tx - fx;
    const ay = ty - fy;
    const at = (x: number, y: number): number => {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 0;
      return map.getTile(x, y) === id ? 1 : 0;
    };
    const top = at(fx, fy) * (1 - ax) + at(fx + 1, fy) * ax;
    const bot = at(fx, fy + 1) * (1 - ax) + at(fx + 1, fy + 1) * ax;
    return top * (1 - ay) + bot * ay;
  };

  for (let j = 0; j < sh; j++) {
    for (let i = 0; i < sw; i++) {
      const wx = x0 + i * SAMPLE_STEP;
      const wy = y0 + j * SAMPLE_STEP;
      const { tx, ty } = screenToTile({ sx: wx, sy: wy });
      const o = (j * sw + i) * 4;
      const edge = Math.min(tx + 0.5, ty + 0.5, map.width - 0.5 - tx, map.height - 0.5 - ty);
      if (edge < 0) {
        data[o + 3] = 0;
        bake?.sample(data, i, j);
        continue;
      }
      const big = fbm(tx * 0.09, ty * 0.09, 11);
      const mid = fbm(tx * 0.35, ty * 0.35, 23);
      const fine = fbm(wx * 0.11, wy * 0.22, 37);
      let c = big < 0.5 ? mix(GRASS_DEEP, GRASS_LUSH, big * 2) : mix(GRASS_LUSH, GRASS_DRY, (big - 0.5) * 2);
      c = shade(c, 0.9 + mid * 0.16 + (fine - 0.5) * 0.14);

      const forest = smooth(weight(tx, ty, TERRAIN.forest));
      if (forest > 0) {
        const floor = mix(FOREST_FLOOR, FOREST_SOIL, fine * 0.8);
        c = mix(c, floor, forest * 0.85);
      }
      const rock = smooth(weight(tx, ty, TERRAIN.gold_mine));
      if (rock > 0) c = mix(c, shade(ROCKY, 0.85 + fine * 0.3), rock * 0.8);
      const water = waterCoverage(map, tx, ty);
      if (water > 0) {
        // Wet sand along the shore, then the (static) water the surface shader animates over.
        c = mix(c, shade(WET_SAND, 0.88 + fine * 0.24), Math.min(1, water / 0.4) * 0.85);
        if (water > 0.42) c = mix(c, shade(WATER, 0.9 + mid * 0.2), Math.min(1, (water - 0.42) / 0.2));
      }

      // Darken towards the map rim so the world fades into the void.
      if (edge < 1.5) c = shade(c, 0.55 + 0.45 * (edge / 1.5));
      const [r, g, b] = hexToRgb(c);
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = edge < 0.25 ? Math.round(255 * (edge / 0.25)) : 255;
      bake?.sample(data, i, j);
    }
  }
  bake?.outline(data);
  low.ctx.putImageData(img, 0, 0);

  const out = makeCanvas(w, h);
  out.ctx.imageSmoothingEnabled = true;
  out.ctx.imageSmoothingQuality = 'high';
  out.ctx.drawImage(low.canvas, 0, 0, sw * SAMPLE_STEP, sh * SAMPLE_STEP);
  paintGroundDetail(out.ctx, map, x0, y0, w, h);
  const normal = bake ? bake.finish(out.canvas) : null;
  return { canvas: out.canvas, normal };
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Grass tufts, flowers and pebbles scattered per tile. */
function paintGroundDetail(
  ctx: CanvasRenderingContext2D,
  map: TerrainSource,
  x0: number,
  y0: number,
  w: number,
  h: number,
): void {
  const flowerColors = [0xf4f1e6, 0xf2d04a, 0xb88ad8, 0xe86a5a];
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const sx = (tx - ty) * HALF_W - x0;
      const sy = (tx + ty) * HALF_H - y0;
      if (sx < -HALF_W || sy < -HALF_H || sx > w + HALF_W || sy > h + HALF_H) continue;
      const terrain = map.getTile(tx, ty);
      if (terrain === TERRAIN.water || terrain === TERRAIN.cliff) continue;
      if (terrain === TERRAIN.forest) {
        paintUndergrowth(ctx, tx, ty, sx, sy);
        continue;
      }
      const tufts = 3 + Math.floor(hash2(tx, ty, 3) * 4);
      for (let k = 0; k < tufts; k++) {
        const px = sx + (hash2(tx, ty, 40 + k) - 0.5) * HALF_W * 1.3;
        const py = sy + (hash2(tx, ty, 60 + k) - 0.5) * HALF_H * 1.3;
        const dark = hash2(tx, ty, 80 + k) > 0.5;
        ctx.strokeStyle = dark ? 'rgba(34,64,20,.55)' : 'rgba(170,205,96,.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - 2, py - 3);
        ctx.lineTo(px, py);
        ctx.lineTo(px + 2, py - 3.5);
        ctx.moveTo(px, py);
        ctx.lineTo(px + 0.3, py - 4);
        ctx.stroke();
      }
      const roll = hash2(tx, ty, 99);
      if (terrain === TERRAIN.grass && roll > 0.86) {
        const color = flowerColors[Math.floor(hash2(tx, ty, 5) * flowerColors.length)] ?? 0xffffff;
        for (let k = 0; k < 4; k++) {
          const px = sx + (hash2(tx, ty, 120 + k) - 0.5) * HALF_W;
          const py = sy + (hash2(tx, ty, 140 + k) - 0.5) * HALF_H;
          ctx.fillStyle = css(color);
          ctx.fillRect(px, py, 1.6, 1.6);
        }
      } else if (roll < 0.06) {
        const px = sx + (hash2(tx, ty, 9) - 0.5) * HALF_W;
        const py = sy + (hash2(tx, ty, 10) - 0.5) * HALF_H;
        ctx.fillStyle = 'rgba(60,56,48,.5)';
        ctx.beginPath();
        ctx.ellipse(px + 0.6, py + 0.8, 2.6, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b8b09c';
        ctx.beginPath();
        ctx.ellipse(px, py, 2.4, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

let undergrowthStamps: HTMLCanvasElement[] | null = null;

/** Small fern and shrub stamps (drawn once, then blitted: path ops per tile are too slow). */
function stamps(): HTMLCanvasElement[] {
  if (undergrowthStamps) return undergrowthStamps;
  const out: HTMLCanvasElement[] = [];
  for (let v = 0; v < 4; v++) {
    const { canvas, ctx } = makeCanvas(14, 10);
    const dark = v % 2 === 0;
    const px = 7;
    const py = 7;
    if (v < 2) {
      // Fern: a fan of fronds.
      ctx.strokeStyle = dark ? 'rgba(28,58,22,.85)' : 'rgba(92,138,52,.8)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let f = -2; f <= 2; f++) {
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + f * 2.2, py - 4, px + f * 3.6, py - 2.5 + Math.abs(f) * 0.8);
      }
      ctx.stroke();
    } else {
      // Shrub: two overlapping clumps with a lit top and a contact shadow.
      ctx.fillStyle = 'rgba(20,34,16,.5)';
      ctx.beginPath();
      ctx.ellipse(px + 1, py + 0.8, 4.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark ? '#2f4a24' : '#46652c';
      ctx.beginPath();
      ctx.ellipse(px - 1.5, py - 1.5, 3.2, 2.4, 0, 0, Math.PI * 2);
      ctx.ellipse(px + 1.8, py - 1.2, 2.8, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(140,180,80,.45)';
      ctx.fillRect(px - 2.5, py - 3.4, 2, 1);
    }
    out.push(canvas);
  }
  undergrowthStamps = out;
  return out;
}

/** Ferns and low shrubs on the forest floor (seen between trunks and where trees fall). */
function paintUndergrowth(ctx: CanvasRenderingContext2D, tx: number, ty: number, sx: number, sy: number): void {
  const art = stamps();
  const n = 2 + Math.floor(hash2(tx, ty, 170) * 3);
  for (let k = 0; k < n; k++) {
    const px = sx + (hash2(tx, ty, 171 + k) - 0.5) * HALF_W * 1.4;
    const py = sy + (hash2(tx, ty, 181 + k) - 0.5) * HALF_H * 1.4;
    const stamp = art[Math.floor(hash2(tx, ty, 191 + k) * art.length)];
    if (stamp) ctx.drawImage(stamp, Math.round(px - 7), Math.round(py - 7));
  }
}
