import type Phaser from 'phaser';
import { TERRAIN_LOOK } from '../config/visual';
import { cliffField, type CliffField } from '../iso/art/cliffArt';
import { lightingActive, lit } from '../iso/art/lighting/LightManager';
import { attachNormalMap, flatGroundNormal } from '../iso/art/lighting/litTextures';
import { paintTerrainChunk } from '../iso/art/terrain';
import { screenToTile, tileToScreen } from '../iso/coordinates';
import { planOccluders, type OccluderPlan } from './CliffOccluders';
import type { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';

const TERRAIN_DEPTH = -1000;
const CHUNK = 512;
/** Multiple of the cliff normal texel (4 px): chunk normal maps then share the occluders' world texel grid. */
const CHUNK_OVERLAP = 4;
/** Distinguishes chunk texture keys of map views alive at once (menu diorama + game). */
let bakeSeq = 0;

export interface WorldBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** World-coord bounds of the tile centres of a width × height map. */
export function mapWorldBounds(width: number, height: number): WorldBounds {
  const corners = [
    tileToScreen({ tx: 0, ty: 0 }),
    tileToScreen({ tx: width - 1, ty: 0 }),
    tileToScreen({ tx: 0, ty: height - 1 }),
    tileToScreen({ tx: width - 1, ty: height - 1 }),
  ];
  const xs = corners.map((c) => c.sx);
  const ys = corners.map((c) => c.sy);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/**
 * The painted terrain of a map: cliff relief, the occluder plan and the
 * chunk images. steps() does the work in slices (one chunk per step) so
 * a caller can spread a long bake (Islands: seconds) over frames behind
 * a loading indicator; runAll() does it at once.
 */
export class TerrainBake {
  cliffs: CliffField | null = null;
  plan: OccluderPlan | null = null;
  readonly chunks: Phaser.GameObjects.Image[] = [];
  private readonly seq = bakeSeq++;
  private done = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: MapData,
  ) {}

  get finished(): boolean {
    return this.done;
  }

  /** Yields progress 0..1 after the relief and after every chunk. */
  *steps(): Generator<number, void> {
    this.cliffs = makeCliffField(this.map);
    this.plan = this.cliffs ? planOccluders(this.cliffs, lightingActive(this.scene)) : null;
    const rects = this.chunkRects();
    yield 0.05;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r) this.paint(r.x, r.y, r.w, r.h, i);
      yield 0.05 + (0.95 * (i + 1)) / rects.length;
    }
    this.done = true;
  }

  /** Frees the chunks of a bake that never became a TileMap (scene left mid-bake). */
  destroy(): void {
    for (const c of this.chunks) {
      const key = c.texture.key;
      c.destroy();
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.chunks.length = 0;
  }

  runAll(): this {
    for (const _ of this.steps()) void _;
    return this;
  }

  private chunkRects(): Array<{ x: number; y: number; w: number; h: number }> {
    const b = mapWorldBounds(this.map.width, this.map.height);
    const o = CHUNK_OVERLAP;
    const x0 = b.minX - 64;
    // Raised plateau tops along the far map edges reach a cliff height above the map.
    // Every chunk origin (x0/y0 − CHUNK_OVERLAP + k · CHUNK) sits on the 4 px normal texel grid.
    const y0 = b.minY - 32 - Math.ceil((this.cliffs?.relief.maxHeight ?? 0) / 4) * 4;
    const x1 = b.maxX + 64;
    const y1 = b.maxY + 32;
    const out: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let y = y0; y < y1; y += CHUNK) {
      for (let x = x0; x < x1; x += CHUNK) {
        const w = Math.min(CHUNK, x1 - x);
        const h = Math.min(CHUNK, y1 - y);
        // Chunks overlap by CHUNK_OVERLAP px so filtering never opens a seam.
        if (rectTouchesMap(this.map, x - o, y - o, w + o * 2, h + o * 2)) out.push({ x: x - o, y: y - o, w: w + o * 2, h: h + o * 2 });
      }
    }
    return out;
  }

  private paint(x: number, y: number, w: number, h: number, n: number): void {
    const key = `terrain_chunk_${this.seq}_${n}`;
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const chunk = paintTerrainChunk(this.map, x, y, w, h, this.cliffs, lightingActive(this.scene), this.plan);
    this.scene.textures.addCanvas(key, chunk.canvas);
    attachNormalMap(this.scene, key, chunk.normal ?? flatGroundNormal());
    this.chunks.push(lit(this.scene.add.image(x, y, key).setOrigin(0, 0).setDepth(TERRAIN_DEPTH)));
  }
}

/** Cliff description for painting, or null on maps without cliffs. */
function makeCliffField(map: MapData): CliffField | null {
  const raw = map.getRawTiles();
  const cliff = new Uint8Array(raw.length);
  let any = false;
  raw.forEach((t, i) => {
    if (t !== TERRAIN.cliff) return;
    cliff[i] = 1;
    any = true;
  });
  return any ? cliffField(map.width, map.height, cliff, TERRAIN_LOOK.cliffHeight, 0, TERRAIN_LOOK.surfaceRes) : null;
}

/** True when a world rect overlaps the map (padded two tiles, for raised tops and the rim fade). */
function rectTouchesMap(map: MapData, x: number, y: number, w: number, h: number): boolean {
  const pad = 2;
  for (let py = y; py <= y + h; py += 16) {
    for (let px = x; px <= x + w; px += 16) {
      const t = screenToTile({ sx: px, sy: py });
      if (t.tx > -pad && t.ty > -pad && t.tx < map.width + pad && t.ty < map.height + pad) return true;
    }
  }
  return false;
}
