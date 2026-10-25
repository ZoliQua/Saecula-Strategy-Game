import { TILE_HEIGHT, TILE_WIDTH } from '../../config/constants';
import { TERRAIN, type TerrainId } from '../../map/TerrainTypes';
import { screenToTile } from '../coordinates';
import { makeCanvas } from './canvas';
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

export interface TerrainSource {
  readonly width: number;
  readonly height: number;
  getTile(tx: number, ty: number): TerrainId;
}

/**
 * Paints one terrain chunk covering world rect (x0, y0, w, h). Colours
 * come from world-space noise, so neighbouring chunks join seamlessly
 * and there is no visible tile grid.
 */
export function paintTerrainChunk(
  map: TerrainSource,
  x0: number,
  y0: number,
  w: number,
  h: number,
): HTMLCanvasElement {
  const sw = Math.ceil(w / SAMPLE_STEP) + 1;
  const sh = Math.ceil(h / SAMPLE_STEP) + 1;
  const low = makeCanvas(sw, sh);
  const img = low.ctx.createImageData(sw, sh);
  const data = img.data;
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
      const water = smooth(weight(tx, ty, TERRAIN.water));
      if (water > 0) c = mix(c, shade(WATER, 0.9 + mid * 0.2), water);

      // Darken towards the map rim so the world fades into the void.
      if (edge < 1.5) c = shade(c, 0.55 + 0.45 * (edge / 1.5));
      const [r, g, b] = hexToRgb(c);
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = edge < 0.25 ? Math.round(255 * (edge / 0.25)) : 255;
    }
  }
  low.ctx.putImageData(img, 0, 0);

  const out = makeCanvas(w, h);
  out.ctx.imageSmoothingEnabled = true;
  out.ctx.imageSmoothingQuality = 'high';
  out.ctx.drawImage(low.canvas, 0, 0, sw * SAMPLE_STEP, sh * SAMPLE_STEP);
  paintGroundDetail(out.ctx, map, x0, y0, w, h);
  return out.canvas;
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
      if (terrain === TERRAIN.water) continue;
      const tufts = terrain === TERRAIN.forest ? 1 : 3 + Math.floor(hash2(tx, ty, 3) * 4);
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
