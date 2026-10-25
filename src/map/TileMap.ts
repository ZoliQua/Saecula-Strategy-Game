import Phaser from 'phaser';
import { ART_SCALE } from '../iso/art/canvas';
import { LightManager, lit } from '../iso/art/lighting/LightManager';
import { attachNormalMap, flatGroundNormal } from '../iso/art/lighting/litTextures';
import { BUSH_VARIANTS, ROCK_VARIANTS, TREE_VARIANTS } from '../iso/art/decor';
import { hash2, tileVariant } from '../iso/art/palette';
import { paintTerrainChunk } from '../iso/art/terrain';
import { tileToScreen, type TileCoord } from '../iso/coordinates';
import { tileDepth } from '../iso/depth';
import { DECOR_ORIGIN_Y, decorKeys, FX_KEYS } from '../iso/textures';
import type { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';
import { FogLayer } from './FogLayer';
import type { FogOfWarData } from './FogOfWarData';

const HIGHLIGHT_DEPTH_OFFSET = 0.5;
const TERRAIN_DEPTH = -1000;
const CLOUD_DEPTH = 9_000;
const CHUNK = 1024;
const CHUNK_OVERLAP = 3;
const DECOR_DEPTH_OFFSET = 0.1;
const HOVER_COLOR = 0xf5a857;

interface Decor {
  sprite: Phaser.GameObjects.Image;
  kind: 'tree' | 'gold' | 'bush' | 'stump';
  phase: number;
  /** Removes the cast shadow (trees). */
  unshadow: (() => void) | null;
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
  private readonly decor = new Map<number, Decor>();
  private readonly clouds: Phaser.GameObjects.TileSprite;
  private readonly fog: FogLayer;
  private highlight: Phaser.GameObjects.Graphics | null = null;
  private selection: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, mapData: MapData) {
    this.scene = scene;
    this.mapData = mapData;
    this.width = mapData.width;
    this.height = mapData.height;

    this.bakeTerrain();
    this.placeDecor();

    const b = this.computeWorldBounds();
    const pad = 600;
    this.clouds = scene.add
      .tileSprite(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2, FX_KEYS.clouds)
      .setOrigin(0, 0)
      .setDepth(CLOUD_DEPTH)
      .setAlpha(0.2)
      .setTileScale(3, 1.6);
    this.fog = new FogLayer(scene, mapData.width, mapData.height);
  }

  private bakeTerrain(): void {
    const b = this.computeWorldBounds();
    const x0 = b.minX - 64;
    const y0 = b.minY - 32;
    const x1 = b.maxX + 64;
    const y1 = b.maxY + 32;
    let n = 0;
    for (let y = y0; y < y1; y += CHUNK) {
      for (let x = x0; x < x1; x += CHUNK) {
        const w = Math.min(CHUNK, x1 - x);
        const h = Math.min(CHUNK, y1 - y);
        const key = `terrain_chunk_${n++}`;
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        // Chunks overlap by CHUNK_OVERLAP px so filtering never opens a seam.
        const o = CHUNK_OVERLAP;
        this.scene.textures.addCanvas(key, paintTerrainChunk(this.mapData, x - o, y - o, w + o * 2, h + o * 2));
        attachNormalMap(this.scene, key, flatGroundNormal());
        this.chunks.push(lit(this.scene.add.image(x - o, y - o, key).setOrigin(0, 0).setDepth(TERRAIN_DEPTH)));
      }
    }
  }

  private placeDecor(): void {
    this.mapData.forEachTile(({ tx, ty }) => this.syncDecor(tx, ty));
  }

  private decorFor(tx: number, ty: number): { key: string; kind: Decor['kind'] } | null {
    switch (this.mapData.getTile(tx, ty)) {
      case TERRAIN.forest:
        return { key: decorKeys.tree(tileVariant(tx, ty, TREE_VARIANTS)), kind: 'tree' };
      case TERRAIN.gold_mine:
        return { key: decorKeys.gold(tileVariant(tx, ty, ROCK_VARIANTS)), kind: 'gold' };
      case TERRAIN.berries:
        return { key: decorKeys.bush(tileVariant(tx, ty, BUSH_VARIANTS)), kind: 'bush' };
      default:
        return null;
    }
  }

  /** Creates, swaps or removes the decor sprite for one tile. */
  private syncDecor(tx: number, ty: number): void {
    const id = ty * this.width + tx;
    const want = this.decorFor(tx, ty);
    const have = this.decor.get(id);
    if (have && want && have.sprite.texture.key === want.key) return;
    if (have) {
      const wasTree = have.kind === 'tree';
      have.unshadow?.();
      have.sprite.destroy();
      this.decor.delete(id);
      if (wasTree && !want) {
        this.addDecor(id, tx, ty, decorKeys.stump, 'stump');
        return;
      }
    }
    if (want) this.addDecor(id, tx, ty, want.key, want.kind);
  }

  private addDecor(id: number, tx: number, ty: number, key: string, kind: Decor['kind']): void {
    const { sx, sy } = tileToScreen({ tx, ty });
    // Small jitter breaks up the grid; trees stay inside their tile.
    const jx = (hash2(tx, ty, 201) - 0.5) * 10;
    const jy = (hash2(tx, ty, 202) - 0.5) * 5;
    const scale = (1 / ART_SCALE) * (kind === 'tree' ? 0.9 + hash2(tx, ty, 203) * 0.25 : 1);
    const sprite = this.scene.add
      .image(sx + jx, sy + jy, key)
      .setOrigin(0.5, DECOR_ORIGIN_Y.get(key) ?? 0.85)
      .setScale(scale)
      .setFlipX(hash2(tx, ty, 204) > 0.5)
      .setDepth(tileDepth({ tx, ty }) + DECOR_DEPTH_OFFSET);
    lit(sprite);
    const unshadow = kind === 'tree' ? LightManager.of(this.scene)?.attachCaster(sprite, key) ?? null : null;
    const d: Decor = { sprite, kind, phase: hash2(tx, ty, 205) * Math.PI * 2, unshadow };
    this.decor.set(id, d);
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
      if (inView && d.kind === 'tree') {
        s.rotation = Math.sin(time * 0.0011 + d.phase) * 0.025 + Math.sin(time * 0.0031 + d.phase * 2) * 0.008;
      }
    }
    for (const c of this.chunks) {
      c.setVisible(c.x < view.right && c.x + c.width > view.x && c.y < view.bottom && c.y + c.height > view.y);
    }
    this.clouds.tilePositionX += delta * 0.006;
    this.clouds.tilePositionY += delta * 0.0025;
    this.fog.update(delta);
  }

  applyFog(fog: FogOfWarData): void {
    this.fog.setTarget(fog);
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
    for (const c of this.chunks) c.destroy();
    for (const d of this.decor.values()) {
      d.unshadow?.();
      d.sprite.destroy();
    }
    this.decor.clear();
    this.clouds.destroy();
    this.fog.destroy();
    this.highlight?.destroy();
    this.selection?.destroy();
  }
}
