import Phaser from 'phaser';
import { ART_SCALE } from '../iso/art/canvas';
import { lightingActive, lit } from '../iso/art/lighting/LightManager';
import { attachNormalMap, flatGroundNormal } from '../iso/art/lighting/litTextures';
import { BUSH_VARIANTS, ROCK_VARIANTS } from '../iso/art/decor';
import { hash2, tileVariant } from '../iso/art/palette';
import { paintTerrainChunk } from '../iso/art/terrain';
import { cliffField, type CliffField } from '../iso/art/cliffArt';
import { TERRAIN_LOOK } from '../config/visual';
import { TerrainSurface } from './TerrainSurface';
import { buildWaterMask, hasWater } from './waterMask';
import { CliffOccluders, planOccluders, type OccluderPlan } from './CliffOccluders';
import { screenToTile, tileToScreen, type TileCoord } from '../iso/coordinates';
import { tileDepth } from '../iso/depth';
import { DECOR_ORIGIN_Y, decorKeys, FX_KEYS } from '../iso/textures';
import type { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';
import { FogLayer } from './FogLayer';
import { ForestLayer } from './ForestLayer';
import type { FogOfWarData } from './FogOfWarData';

const HIGHLIGHT_DEPTH_OFFSET = 0.5;
const TERRAIN_DEPTH = -1000;
const CLOUD_DEPTH = 9_000;
/** Cloud pattern repeat scale in world px per texture px. */
const CLOUD_SCALE_X = 3;
const CLOUD_SCALE_Y = 1.6;
/** Screen px of cloud layer beyond each view edge. */
const CLOUD_PAD = 64;
const CHUNK = 512;
/** Distinguishes chunk texture keys of map views alive at once (menu diorama + game). */
let tileMapSeq = 0;
/** Multiple of the cliff normal texel (4 px): chunk normal maps then share the occluders' world texel grid. */
const CHUNK_OVERLAP = 4;
const DECOR_DEPTH_OFFSET = 0.1;
const HOVER_COLOR = 0xf5a857;

interface Decor {
  sprite: Phaser.GameObjects.Image;
  kind: 'gold' | 'bush' | 'stump';
}

/**
 * Renders the isometric world: painted terrain chunks, per-tile decor
 * (trees, gold rocks, berry bushes), a soft fog-of-war layer and
 * drifting cloud shadows. Call update() every frame for the ambient
 * animation (tree sway, clouds, fog fades).
 */
export class TileMap {
  public readonly width: number;
  public readonly height: number;

  private readonly scene: Phaser.Scene;
  private readonly mapData: MapData;
  private readonly chunks: Phaser.GameObjects.Image[] = [];
  private readonly seq = tileMapSeq++;
  private readonly decor = new Map<number, Decor>();
  private forest!: ForestLayer;
  private readonly cliffs: CliffField | null;
  private readonly occluders: CliffOccluders | null;
  private readonly surface: TerrainSurface;
  private readonly clouds: Phaser.GameObjects.TileSprite;
  /** Cloud drift in texture px. */
  private readonly cloudDrift = { x: 0, y: 0 };
  private readonly fog: FogLayer;
  private highlight: Phaser.GameObjects.Graphics | null = null;
  private selection: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, mapData: MapData) {
    this.scene = scene;
    this.mapData = mapData;
    this.width = mapData.width;
    this.height = mapData.height;

    this.cliffs = makeCliffField(mapData);
    const plan = this.cliffs ? planOccluders(this.cliffs, lightingActive(scene)) : null;
    this.bakeTerrain(plan);
    this.occluders = this.cliffs && plan ? new CliffOccluders(scene, this.cliffs, plan) : null;
    this.placeDecor();
    this.surface = new TerrainSurface(
      scene,
      this.computeWorldBounds(),
      mapData,
      TERRAIN_LOOK.surfaceRes,
      this.cliffs?.relief ?? null,
      hasWater(mapData) ? buildWaterMask(mapData, TERRAIN_LOOK.surfaceRes) : null,
    );

    // Camera-sized layer (a map-sized TileSprite allocates a canvas of the
    // whole world, >100 MB on large maps); update() keeps it over the view
    // and offsets the pattern so the clouds stay fixed to the ground.
    this.clouds = scene.add
      .tileSprite(0, 0, scene.scale.width + CLOUD_PAD * 2, scene.scale.height + CLOUD_PAD * 2, FX_KEYS.clouds)
      .setOrigin(0, 0)
      .setDepth(CLOUD_DEPTH)
      .setAlpha(0.2);
    this.fog = new FogLayer(scene, mapData.width, mapData.height);
  }

  private bakeTerrain(plan: OccluderPlan | null): void {
    const b = this.computeWorldBounds();
    const x0 = b.minX - 64;
    // Raised plateau tops along the far map edges reach a cliff height above the map.
    // Every chunk origin (x0/y0 − CHUNK_OVERLAP + k · CHUNK) sits on the 4 px normal texel grid.
    const y0 = b.minY - 32 - Math.ceil((this.cliffs?.relief.maxHeight ?? 0) / 4) * 4;
    const x1 = b.maxX + 64;
    const y1 = b.maxY + 32;
    let n = 0;
    for (let y = y0; y < y1; y += CHUNK) {
      for (let x = x0; x < x1; x += CHUNK) {
        const w = Math.min(CHUNK, x1 - x);
        const h = Math.min(CHUNK, y1 - y);
        // Chunks overlap by CHUNK_OVERLAP px so filtering never opens a seam.
        const o = CHUNK_OVERLAP;
        if (!rectTouchesMap(this.mapData, x - o, y - o, w + o * 2, h + o * 2)) continue;
        const key = `terrain_chunk_${this.seq}_${n++}`;
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        const chunk = paintTerrainChunk(this.mapData, x - o, y - o, w + o * 2, h + o * 2, this.cliffs, lightingActive(this.scene), plan);
        this.scene.textures.addCanvas(key, chunk.canvas);
        attachNormalMap(this.scene, key, chunk.normal ?? flatGroundNormal());
        this.chunks.push(lit(this.scene.add.image(x - o, y - o, key).setOrigin(0, 0).setDepth(TERRAIN_DEPTH)));
      }
    }
  }

  private placeDecor(): void {
    this.forest = new ForestLayer(this.scene, this.mapData);
    this.mapData.forEachTile(({ tx, ty }) => this.syncDecor(tx, ty));
  }

  private decorFor(tx: number, ty: number): { key: string; kind: Decor['kind'] } | null {
    switch (this.mapData.getTile(tx, ty)) {
      case TERRAIN.gold_mine:
        return { key: decorKeys.gold(tileVariant(tx, ty, ROCK_VARIANTS)), kind: 'gold' };
      case TERRAIN.berries:
        return { key: decorKeys.bush(tileVariant(tx, ty, BUSH_VARIANTS)), kind: 'bush' };
      default:
        return null;
    }
  }

  /** Creates, swaps or removes the decor sprite for one tile (trees: see ForestLayer). */
  private syncDecor(tx: number, ty: number): void {
    const id = ty * this.width + tx;
    if (this.forest.has(tx, ty) && this.mapData.getTile(tx, ty) !== TERRAIN.forest) {
      // A chopped-down tree leaves its stump.
      this.forest.remove(tx, ty);
      this.addDecor(id, tx, ty, decorKeys.stump, 'stump');
      return;
    }
    const want = this.decorFor(tx, ty);
    const have = this.decor.get(id);
    if (have && want && have.sprite.texture.key === want.key) return;
    if (have) {
      if (have.kind === 'stump' && !want) return;
      have.sprite.destroy();
      this.decor.delete(id);
    }
    if (want) this.addDecor(id, tx, ty, want.key, want.kind);
  }

  private addDecor(id: number, tx: number, ty: number, key: string, kind: Decor['kind']): void {
    const { sx, sy } = tileToScreen({ tx, ty });
    // Small jitter breaks up the grid; trees stay inside their tile.
    const jx = (hash2(tx, ty, 201) - 0.5) * 10;
    const jy = (hash2(tx, ty, 202) - 0.5) * 5;
    const scale = 1 / ART_SCALE;
    const sprite = this.scene.add
      .image(sx + jx, sy + jy, key)
      .setOrigin(0.5, DECOR_ORIGIN_Y.get(key) ?? 0.85)
      .setScale(scale)
      .setFlipX(hash2(tx, ty, 204) > 0.5)
      .setDepth(tileDepth({ tx, ty }) + DECOR_DEPTH_OFFSET);
    lit(sprite);
    this.decor.set(id, { sprite, kind });
  }

  /** See CliffOccluders.sortAboveFootprint; returns the release function (no-op without cliffs). */
  sortCliffsAboveBuilding(fx: number, fy: number, w: number, h: number, depth: number): () => void {
    return this.occluders?.sortAboveFootprint(fx, fy, w, h, depth) ?? (() => undefined);
  }

  /** Re-reads terrain for one tile (e.g. a depleted resource). */
  refreshTile(tx: number, ty: number): void {
    this.syncDecor(tx, ty);
  }

  /** Per-frame ambient animation. */
  update(time: number, delta: number): void {
    const view = this.scene.cameras.main.worldView;
    // Off-screen culling: Phaser batches every visible object, and the lit
    // pipeline breaks batches per texture, so hidden decor saves draw calls.
    const margin = 80;
    for (const d of this.decor.values()) {
      const s = d.sprite;
      const inView = !(s.x < view.x - margin || s.x > view.right + margin || s.y < view.y - margin || s.y > view.bottom + margin * 2);
      s.setVisible(inView);
    }
    this.forest.update(time);
    this.occluders?.update(view);
    this.surface.update(time);
    for (const c of this.chunks) {
      c.setVisible(c.x < view.right && c.x + c.width > view.x && c.y < view.bottom && c.y + c.height > view.y);
    }
    this.updateClouds(delta);
    this.fog.update(delta);
  }

  /** Keeps the screen-sized cloud layer over the camera, pattern locked to the world. */
  private updateClouds(delta: number): void {
    const cam = this.scene.cameras.main;
    const w = this.scene.scale.width + CLOUD_PAD * 2;
    const h = this.scene.scale.height + CLOUD_PAD * 2;
    if (this.clouds.width !== w || this.clouds.height !== h) this.clouds.setSize(w, h);
    const k = 1 / cam.zoom;
    const x = cam.worldView.x - CLOUD_PAD * k;
    const y = cam.worldView.y - CLOUD_PAD * k;
    this.cloudDrift.x += delta * 0.006;
    this.cloudDrift.y += delta * 0.0025;
    this.clouds.setScale(k).setPosition(x, y).setTileScale(CLOUD_SCALE_X * cam.zoom, CLOUD_SCALE_Y * cam.zoom);
    this.clouds.tilePositionX = x / CLOUD_SCALE_X + this.cloudDrift.x;
    this.clouds.tilePositionY = y / CLOUD_SCALE_Y + this.cloudDrift.y;
  }

  applyFog(fog: FogOfWarData): void {
    this.fog.setTarget(fog);
    this.forest.setFog(fog);
  }

  setHoverTile(tile: TileCoord | null): void {
    if (!tile) {
      this.highlight?.setVisible(false);
      return;
    }
    if (!this.highlight) this.highlight = this.drawDiamond(HOVER_COLOR, 0.9, 0.12);
    this.placeOverlay(this.highlight, tile);
  }

  setSelectedTile(tile: TileCoord | null): void {
    if (!tile) {
      this.selection?.setVisible(false);
      return;
    }
    if (!this.selection) this.selection = this.drawDiamond(0xffffff, 0.8, 0.06);
    this.placeOverlay(this.selection, tile);
  }

  /** World-coord bounds (sx_min, sy_min, sx_max, sy_max). */
  getWorldBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    return this.computeWorldBounds();
  }

  private computeWorldBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const corners = [
      tileToScreen({ tx: 0, ty: 0 }),
      tileToScreen({ tx: this.width - 1, ty: 0 }),
      tileToScreen({ tx: 0, ty: this.height - 1 }),
      tileToScreen({ tx: this.width - 1, ty: this.height - 1 }),
    ];
    const xs = corners.map((c) => c.sx);
    const ys = corners.map((c) => c.sy);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }

  private placeOverlay(overlay: Phaser.GameObjects.Graphics, tile: TileCoord): void {
    const { sx, sy } = tileToScreen(tile);
    overlay.setPosition(sx, sy);
    overlay.setDepth(tileDepth(tile) + HIGHLIGHT_DEPTH_OFFSET);
    overlay.setVisible(true);
  }

  private drawDiamond(color: number, lineAlpha: number, fillAlpha: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const hw = 30;
    const hh = 15;
    const pts = [new Phaser.Math.Vector2(0, -hh), new Phaser.Math.Vector2(hw, 0), new Phaser.Math.Vector2(0, hh), new Phaser.Math.Vector2(-hw, 0)];
    g.fillStyle(color, fillAlpha);
    g.fillPoints(pts, true);
    g.lineStyle(1.5, color, lineAlpha);
    g.strokePoints(pts, true);
    g.setVisible(false);
    return g;
  }

  destroy(): void {
    for (const c of this.chunks) {
      const key = c.texture.key;
      c.destroy();
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.occluders?.destroy();
    this.surface.destroy();
    for (const d of this.decor.values()) d.sprite.destroy();
    this.forest.destroy();
    this.decor.clear();
    this.clouds.destroy();
    this.fog.destroy();
    this.highlight?.destroy();
    this.selection?.destroy();
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
